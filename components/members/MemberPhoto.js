"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Toast, { Spinner, useToast } from "@/components/ui/Toast";
import { CameraIcon, TrashIcon } from "@/components/ui/icons";
import styles from "./MemberPhoto.module.css";

/** Longest side of the photo that is uploaded - plenty for an avatar. */
const MAX_SIDE = 800;

/**
 * Shrinks a photo in the browser before it is uploaded, so even a 10 MB
 * phone camera picture goes up as a ~100 KB JPEG. A file the browser cannot
 * draw (some HEIC photos) is sent as it is.
 */
async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/**
 * The member's photo on their page, with a camera badge. Tapping it opens a
 * dialog with a large preview, Choose photo and - when there is one - Remove
 * photo. The photo goes to our own API, which stores it on Cloudinary.
 */
export default function MemberPhoto({ member, size = 56 }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useToast();
  const name = member.full_name;

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      setToast({ status: "error", message: "That file is not a photo." });
      return;
    }

    setBusy(true);
    setToast({ status: "loading", message: "Uploading photo…" });
    const body = new FormData();
    body.append("photo", await shrink(file));
    const response = await fetch(`/api/members/${member.id}/photo`, { method: "POST", body }).catch(() => null);
    const data = await response?.json().catch(() => null);
    setBusy(false);

    if (!response?.ok) {
      setToast({ status: "error", message: data?.message ?? "The photo could not be uploaded. Please try again." });
      return;
    }
    setOpen(false);
    setToast({ status: "done", message: "Photo saved" });
    router.refresh();
  };

  const remove = async () => {
    setBusy(true);
    setToast({ status: "loading", message: "Removing photo…" });
    const response = await fetch(`/api/members/${member.id}/photo`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setToast({ status: "error", message: "The photo could not be removed. Please try again." });
      return;
    }
    setOpen(false);
    setToast({ status: "done", message: "Photo removed" });
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label={member.photo_url ? `Change ${name}'s photo` : `Add a photo of ${name}`}
      >
        <Avatar src={member.photo_url} name={name} gender={member.gender} size={size} />
        <span className={styles.badge} aria-hidden="true">
          <CameraIcon size={13} />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.input}
        onChange={upload}
        tabIndex={-1}
        aria-hidden="true"
      />

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          dismissible={!busy}
          title={member.photo_url ? "Member photo" : "Add a photo"}
          footer={
            <>
              {member.photo_url ? (
                <Button variant="ghost" onClick={remove} disabled={busy} className={styles.removeButton}>
                  <TrashIcon size={15} />
                  Remove
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
              )}
              <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
                {busy ? <Spinner /> : <CameraIcon size={15} />}
                {member.photo_url ? "Change photo" : "Choose photo"}
              </Button>
            </>
          }
        >
          <div className={styles.preview}>
            <Avatar src={member.photo_url} name={name} gender={member.gender} size={140} />
            <p className={styles.previewName}>{name}</p>
            <p className={styles.previewHint}>
              {member.photo_url
                ? "This photo shows next to their name across the app."
                : "Take a photo or pick one from the gallery. It shows next to their name across the app."}
            </p>
          </div>
        </Modal>
      )}

      <Toast toast={toast} />
    </>
  );
}
