"use client";

import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import Toast, { Spinner, useToast } from "./Toast";
import { DownloadIcon } from "./icons";
import styles from "./DownloadPdfButton.module.css";

/** The file name the server chose, from its Content-Disposition header. */
function fileNameFrom(response, fallback) {
  const match = response.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

/**
 * Downloads a list as a PDF - see app/api/export/[list] and lib/pdf/exports.js.
 *
 *   1. a click asks first: "Download Members - Expired as PDF?"
 *   2. on Download, a "Preparing PDF…" message shows while the server builds it
 *   3. the file is saved right here - the page does not change - and a
 *      "Downloaded" message shows, then clears itself after a few seconds
 *
 * It is a button, never a link, so it can sit on a card that is itself a
 * link (the dashboard figures) without opening that link.
 *
 * @param {'members'|'payments'} list
 * @param {object} [params]  the page's filters, e.g. { status: "expired" };
 *                           empty values are left out
 * @param {string} [title]   what is being downloaded, for the confirmation
 * @param {boolean} [iconOnly] a small square icon button, for card headers
 * @param {'default'|'onColor'} [variant] onColor sits on a coloured card
 */
export default function DownloadPdfButton({
  list,
  params = {},
  title = "this list",
  iconOnly = false,
  variant = "default",
  className = "",
}) {
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useToast();

  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ).toString();
  const href = `/api/export/${list}${query ? `?${query}` : ""}`;

  const open = (event) => {
    // On a dashboard figure the card itself is a link - do not follow it.
    event.preventDefault();
    event.stopPropagation();
    setConfirming(true);
  };

  const download = async () => {
    setConfirming(false);
    setToast({ status: "loading", message: "Preparing PDF…" });
    try {
      const response = await fetch(href);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message ?? "The PDF could not be made.");
      }
      const name = fileNameFrom(response, `aura-${list}.pdf`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setToast({ status: "done", message: `Downloaded ${name}` });
    } catch (error) {
      setToast({
        status: "error",
        message: error?.message ?? "The PDF could not be downloaded. Please try again.",
      });
    }
  };

  const label = `Download ${title} as PDF`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={toast.status === "loading"}
        className={[
          styles.button,
          iconOnly ? styles.iconOnly : "",
          variant === "onColor" ? styles.onColor : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        title={label}
        aria-label={label}
      >
        {toast.status === "loading" ? (
          <Spinner />
        ) : (
          <DownloadIcon size={iconOnly ? 16 : 15} />
        )}
        {!iconOnly && <span>PDF</span>}
      </button>

      {confirming && (
        <Modal
          open
          onClose={() => setConfirming(false)}
          title="Download as PDF?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={download}>
                <DownloadIcon size={15} />
                Download
              </Button>
            </>
          }
        >
          <p>
            <strong>{title}</strong> will be saved as a PDF - the whole list, with
            the filters you have applied.
          </p>
        </Modal>
      )}

      <Toast toast={toast} />
    </>
  );
}
