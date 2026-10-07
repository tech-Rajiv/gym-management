"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { PlusIcon } from "@/components/ui/icons";
import CreateGymForm from "./CreateGymForm";
import styles from "./AddGymButton.module.css";

/** Opens the new-gym form. The form stays closed until it is needed. */
export default function AddGymButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="primary" size="small" className={styles.button} onClick={() => setOpen(true)}>
        <PlusIcon size={16} />
        Add a gym
      </Button>

      {open && (
        <Modal open onClose={() => setOpen(false)} title="Add a gym">
          <p className={styles.note}>The owner uses this email and password on the gym login page.</p>
          <CreateGymForm />
        </Modal>
      )}
    </>
  );
}
