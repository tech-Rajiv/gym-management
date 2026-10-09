"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { BuildingPlusIcon } from "@/components/ui/icons";
import CreateGymForm from "./CreateGymForm";
import styles from "./AddGymButton.module.css";

/** Opens the new-gym form. The form stays closed until it is needed. */
export default function AddGymButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.cta} onClick={() => setOpen(true)}>
        <span className={styles.ctaIcon} aria-hidden="true">
          <BuildingPlusIcon size={18} />
        </span>
        Add a gym
      </button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Add a gym">
          <div className={styles.modalIntro}>
            <span className={styles.modalIcon} aria-hidden="true">
              <BuildingPlusIcon size={20} />
            </span>
            <p className={styles.note}>
              The owner uses this email and password on the gym login page.
            </p>
          </div>
          <CreateGymForm />
        </Modal>
      )}
    </>
  );
}
