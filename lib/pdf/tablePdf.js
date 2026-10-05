import "server-only";

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { APP_NAME, GYM_TIMEZONE } from "@/lib/config";

/**
 * One clean, branded PDF layout for every list the app can download -
 * members, payments, history, plans.
 *
 *   ┌───────────────────────────────────────────────┐
 *   │ AURA FITNESS        Generated 02 Oct, 6:46 pm │  brand band
 *   │ Members - Expiring Soon                       │
 *   └───────────────────────────────────────────────┘
 *   Status: Expiring Soon · Search: "rah"            filters applied
 *   [ 3 members ]                                    summary boxes
 *   ┌ table, header repeated on every page ─────────┐
 *   Aura Fitness · Members              Page 1 of 2   footer
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
  brandSoft: [238, 240, 255],
  text: [16, 24, 40],
  muted: [102, 112, 133],
  border: [227, 232, 241],
  stripe: [246, 248, 252],
  success: [6, 118, 71],
  warning: [181, 71, 8],
  danger: [192, 16, 72],
  white: [255, 255, 255],
};

/** Money in a PDF: "Rs. 1,500" - the built-in fonts have no rupee sign. */
export function formatRupees(amount) {
  if (amount === null || amount === undefined || amount === "") return "-";
  return `Rs. ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(amount))}`;
}

/** "02 Oct 2026, 3:45 PM" in the gym's timezone. */
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
    .replace(/✓/g, "");
}

/**
 * Builds a table PDF.
 *
 * @param {object}   options
 * @param {string}   options.title      e.g. "Members - Expiring Soon"
 * @param {string[]} [options.filters]  lines describing what was filtered
 * @param {{label: string, value: string}[]} [options.summary] totals boxes
 * @param {{header: string, key: string, width?: number,
 *          align?: 'left'|'right'|'center'}[]} options.columns
 * @param {object[]} options.rows  each value a string, or { content, tone }
 *                                 where tone is success | warning | danger | muted
 * @param {'portrait'|'landscape'} [options.orientation]
 * @param {string}   [options.emptyText]
 * @returns {ArrayBuffer} the PDF file
 */
export function buildTablePdf({
  title,
  filters = [],
  summary = [],
  columns,
  rows,
  orientation = "portrait",
  emptyText = "Nothing to show for these filters.",
}) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // --- Brand band ---------------------------------------------------------
  doc.setFillColor(...COLORS.brand);
  doc.rect(0, 0, pageWidth, 26, "F");
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(APP_NAME.toUpperCase(), margin, 10, { charSpace: 0.6 });
  doc.setFontSize(17);
  doc.text(pdfSafe(title), margin, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Generated ${generatedAt()}`, pageWidth - margin, 10, { align: "right" });

  // --- Filters ------------------------------------------------------------
  let y = 34;
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(9);
  for (const line of filters.filter(Boolean)) {
    doc.text(pdfSafe(line), margin, y);
    y += 5;
  }

  // --- Summary boxes --------------------------------------------------------
  if (summary.length > 0) {
    y += 1;
    let x = margin;
    for (const item of summary) {
      const value = pdfSafe(item.value);
      const label = pdfSafe(item.label);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const width = Math.max(doc.getTextWidth(value), (doc.getTextWidth(label) * 8) / 12) + 10;
      doc.setFillColor(...COLORS.brandSoft);
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(x, y, width, 14, 2, 2, "FD");
      doc.setTextColor(...COLORS.brand);
      doc.text(value, x + 5, y + 6.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.muted);
      doc.text(label, x + 5, y + 11.2);
      x += width + 4;
    }
    y += 19;
  } else {
    y += 2;
  }

  // --- The table ------------------------------------------------------------
  const body = rows.map((row) =>
    columns.map((column) => {
      const cell = row[column.key];
      const isObject = cell !== null && typeof cell === "object";
      return { content: pdfSafe(isObject ? cell.content : cell ?? "-"), tone: isObject ? cell.tone : null };
    })
  );

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [columns.map((column) => column.header)],
    body: body.length > 0 ? body.map((cells) => cells.map((cell) => cell.content)) : [[emptyText]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: COLORS.text,
      cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 },
      lineColor: COLORS.border,
      lineWidth: { bottom: 0.2 },
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: COLORS.brandSoft,
      textColor: COLORS.brand,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: COLORS.stripe },
    columnStyles: Object.fromEntries(
      columns.map((column, index) => [
        index,
        { cellWidth: column.width ?? "auto", halign: column.align ?? "left" },
      ])
    ),
    rowPageBreak: "avoid",
    didParseCell(data) {
      if (data.section !== "body") return;
      if (body.length === 0) {
        data.cell.colSpan = columns.length;
        data.cell.styles.halign = "center";
        data.cell.styles.textColor = COLORS.muted;
        return;
      }
      if (data.column.index === 0) data.cell.styles.fontStyle = "bold";
      const tone = body[data.row.index]?.[data.column.index]?.tone;
      if (tone) {
        data.cell.styles.textColor = COLORS[tone] ?? COLORS.text;
        if (tone !== "muted") data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // --- Footer on every page ---------------------------------------------------
  const pages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(`${APP_NAME} - ${pdfSafe(title)}`, margin, pageHeight - 6);
    doc.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
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
