import "server-only";

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { APP_NAME, GYM_TIMEZONE } from "@/lib/config";

/**
 * One clean report layout for every list the app can download - members,
 * payments, a plan's members.
 *
 *   AURA FITNESS                                  Members report
 *   ────────────────────────────────────────────────────────────
 *   Memberships Expiring Soon                               title
 *   Members whose membership ends in the next 7 days.    subtitle
 *   ┌ SHOWING        MEMBERS   GENERATED ──────────────┐
 *   │ Expiring Soon  3         05 Oct 2026, 2:01 pm    │  details
 *   └────────────────────────────────────────────────────┘
 *   #  MEMBER        PHONE    ...   STATUS                  table
 *   1  Meera ...     ...            (Expiring Soon)
 *   ────────────────────────────────────────────────────────────
 *   Aura Fitness · Memberships Expiring Soon       Page 1 of 2
 *
 * Mostly black, grey and white like a printed statement; colour is kept to
 * the gym's name and the small status pills, where it carries meaning.
 *
 * Built on the server with jsPDF + jspdf-autotable, from the database rather
 * than from what is on screen, so a PDF is the whole list (not just what was
 * scrolled to), its text is real text, and rows never split across pages.
 *
 * The PDF's built-in fonts cannot draw "₹" or "→", so money is written
 * "Rs. 1,500" (see formatRupees) and ranges use "to".
 */

const COLORS = {
  brand: [79, 70, 229],
  text: [17, 24, 39],
  body: [55, 65, 81],
  muted: [107, 114, 128],
  rule: [17, 24, 39],
  border: [229, 231, 235],
  panel: [249, 250, 251],
  head: [243, 244, 246],
  success: [4, 120, 87],
  successSoft: [220, 252, 231],
  warning: [180, 83, 9],
  warningSoft: [254, 243, 199],
  danger: [190, 18, 60],
  dangerSoft: [255, 228, 230],
};

/** Money in a PDF: "Rs. 1,500" - the built-in fonts have no rupee sign. */
export function formatRupees(amount) {
  if (amount === null || amount === undefined || amount === "") return "-";
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(amount))}`;
}

/** "05 Oct 2026, 2:01 pm" in the gym's timezone. */
function generatedAt() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: GYM_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

/** Swap characters the built-in fonts cannot draw for ones they can. */
function pdfSafe(text) {
  return String(text ?? "")
    .replace(/₹\s?/g, "Rs. ")
    .replace(/→/g, "to")
    .replace(/[–—]/g, "-")
    .replace(/✓/g, "");
}

/**
 * The label / value pairs under the title, laid out left to right in a
 * light panel and wrapped onto a second line if they do not fit.
 *
 * @returns {number} the y position just below the panel
 */
function drawDetails(doc, details, { x, y, width }) {
  const padX = 5;
  const gap = 8;
  const lineHeight = 13;

  // Measure each pair at the sizes it is drawn at.
  const items = details.map(({ label, value }) => {
    const labelText = pdfSafe(label).toUpperCase();
    const valueText = pdfSafe(value);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const labelWidth = doc.getTextWidth(labelText) + labelText.length * 0.25;
    doc.setFontSize(10);
    const valueWidth = doc.getTextWidth(valueText);
    return { labelText, valueText, width: Math.max(labelWidth, valueWidth) };
  });

  // Flow them into lines.
  const lines = [[]];
  let used = 0;
  for (const item of items) {
    const needed = item.width + (lines.at(-1).length ? gap * 2 : 0);
    if (lines.at(-1).length && used + needed > width - padX * 2) {
      lines.push([]);
      used = 0;
    }
    used += item.width + (lines.at(-1).length ? gap * 2 : 0);
    lines.at(-1).push(item);
  }

  const height = lines.length * lineHeight + 3;
  doc.setFillColor(...COLORS.panel);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, "FD");

  lines.forEach((line, lineIndex) => {
    let cursor = x + padX;
    const top = y + 2 + lineIndex * lineHeight;
    line.forEach((item, index) => {
      if (index > 0) {
        // A thin divider between pairs.
        doc.setDrawColor(...COLORS.border);
        doc.line(cursor + gap, top + 2.5, cursor + gap, top + lineHeight - 2);
        cursor += gap * 2;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...COLORS.muted);
      doc.text(item.labelText, cursor, top + 5.2, { charSpace: 0.25 });
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.text);
      doc.text(item.valueText, cursor, top + 10.3);
      cursor += item.width;
    });
  });

  return y + height;
}

/**
 * Builds a table PDF.
 *
 * @param {object}   options
 * @param {string}   options.kind      the sort of report, top right - e.g. "Members report"
 * @param {string}   options.title     says exactly what this is - e.g. "Memberships Expiring Soon"
 * @param {string}   [options.subtitle] one sentence on what the list contains
 * @param {{label: string, value: string}[]} [options.details] the filter
 *                   applied and the totals; "Generated" is added at the end
 * @param {{header: string, key: string, width?: number, bold?: boolean,
 *          align?: 'left'|'right'|'center'}[]} options.columns
 *                   `bold` marks the column that names the row (the member)
 *                   or carries the figure that matters (an amount)
 * @param {object[]} options.rows  each value a string, or { content, tone }
 *                   where tone is success | warning | danger (a status pill)
 *                   or muted (grey text)
 * @param {'portrait'|'landscape'} [options.orientation]
 * @param {boolean}  [options.numbered] a "#" column counting the rows
 * @param {string}   [options.emptyText]
 * @returns {ArrayBuffer} the PDF file
 */
export function buildTablePdf({
  kind = "Report",
  title,
  subtitle,
  details = [],
  columns,
  rows,
  orientation = "portrait",
  numbered = true,
  emptyText = "Nothing to show for these filters.",
}) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const safeTitle = pdfSafe(title);

  // --- Letterhead -----------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.brand);
  doc.text(APP_NAME.toUpperCase(), margin, 14, { charSpace: 0.8 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(pdfSafe(kind), pageWidth - margin, 14, { align: "right" });
  doc.setDrawColor(...COLORS.rule);
  doc.setLineWidth(0.5);
  doc.line(margin, 17.5, pageWidth - margin, 17.5);

  // --- Title and what it shows ---------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.text);
  doc.text(safeTitle, margin, 28);
  let y = 28;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLORS.muted);
    const lines = doc.splitTextToSize(pdfSafe(subtitle), contentWidth);
    doc.text(lines, margin, 34.5);
    y = 34.5 + (lines.length - 1) * 4.5;
  }

  // --- Details panel ----------------------------------------------------------
  y = drawDetails(doc, [...details, { label: "Generated", value: generatedAt() }], {
    x: margin,
    y: y + 5,
    width: contentWidth,
  });

  // --- The table ------------------------------------------------------------
  const allColumns = numbered
    ? [{ header: "#", key: "__index", width: 9, align: "right" }, ...columns]
    : columns;
  const body = rows.map((row, index) =>
    allColumns.map((column) => {
      if (column.key === "__index") return { content: String(index + 1), tone: "muted" };
      const cell = row[column.key];
      const isObject = cell !== null && typeof cell === "object";
      return { content: pdfSafe(isObject ? cell.content : cell ?? "-"), tone: isObject ? cell.tone : null };
    })
  );
  const isPill = (tone) => tone === "success" || tone === "warning" || tone === "danger";

  autoTable(doc, {
    startY: y + 6,
    margin: { left: margin, right: margin, top: 16, bottom: 18 },
    head: [allColumns.map((column) => column.header.toUpperCase())],
    body: body.length > 0 ? body.map((cells) => cells.map((cell) => cell.content)) : [[emptyText]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: COLORS.body,
      cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
      lineColor: COLORS.border,
      lineWidth: { bottom: 0.2 },
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.head,
      textColor: COLORS.muted,
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineWidth: { bottom: 0.3 },
      lineColor: [209, 213, 219],
    },
    columnStyles: Object.fromEntries(
      allColumns.map((column, index) => [
        index,
        { cellWidth: column.width ?? "auto", halign: column.align ?? "left" },
      ])
    ),
    rowPageBreak: "avoid",
    didParseCell(data) {
      if (data.section === "head") {
        data.cell.styles.halign = allColumns[data.column.index]?.align ?? "left";
        return;
      }
      if (data.section !== "body") return;
      if (body.length === 0) {
        data.cell.colSpan = allColumns.length;
        data.cell.styles.halign = "center";
        data.cell.styles.textColor = COLORS.muted;
        data.cell.styles.cellPadding = 8;
        return;
      }
      if (allColumns[data.column.index]?.bold) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = COLORS.text;
      }
      const tone = body[data.row.index]?.[data.column.index]?.tone;
      if (tone === "muted") data.cell.styles.textColor = COLORS.muted;
      // Status pills are drawn by hand below; leave the cell's own text empty.
      if (isPill(tone)) data.cell.text = [""];
    },
    didDrawCell(data) {
      if (data.section !== "body" || body.length === 0) return;
      const cell = body[data.row.index]?.[data.column.index];
      if (!cell || !isPill(cell.tone)) return;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const width = doc.getTextWidth(cell.content) + 5;
      const height = 5;
      const x = data.cell.x + data.cell.padding("left");
      const top = data.cell.y + (data.cell.height - height) / 2;
      doc.setFillColor(...COLORS[`${cell.tone}Soft`]);
      doc.roundedRect(x, top, width, height, 2.5, 2.5, "F");
      doc.setTextColor(...COLORS[cell.tone]);
      doc.text(cell.content, x + 2.5, top + 3.5);
    },
  });

  // --- Footer on every page ---------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${APP_NAME}  ·  ${safeTitle}`, margin, pageHeight - 7);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  return doc.output("arraybuffer");
}

/** A PDF as a download response. */
export function pdfResponse(buffer, filename) {
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
