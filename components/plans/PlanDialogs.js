"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import { apiRequest, formToObject } from "@/lib/client/api";
import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import styles from "./PlanDialogs.module.css";

/**
 * Add / Edit and Delete for a plan - used by the Plans page (Add) and the
 * plan's own page (Edit, Delete).
 */

/**
 * Cardio: two big choices, with a tick or a cross, rather than a small
 * checkbox - it is the main thing a plan promises. A new plan starts with
 * neither picked so it is always chosen on purpose.
 */
function CardioChoice({ defaultValue, error }) {
  const [value, setValue] = useState(defaultValue);

  return (
    <fieldset className={styles.cardio}>
      <legend className={styles.cardioLegend}>
        Cardio<span className={styles.required}>*</span>
      </legend>
      <div className={styles.cardioOptions}>
        <label className={`${styles.cardioOption} ${styles.included} ${value === "yes" ? styles.checked : ""}`}>
          <input
            type="radio"
            name="includesCardio"
            value="yes"
            checked={value === "yes"}
            onChange={() => setValue("yes")}
          />
          <span className={styles.cardioMark} aria-hidden="true">
            <CheckIcon size={14} />
          </span>
          Cardio included
        </label>
        <label className={`${styles.cardioOption} ${styles.excluded} ${value === "no" ? styles.checked : ""}`}>
          <input
            type="radio"
            name="includesCardio"
            value="no"
            checked={value === "no"}
            onChange={() => setValue("no")}
          />
          <span className={styles.cardioMark} aria-hidden="true">
            <CloseIcon size={14} />
          </span>
          No cardio
        </label>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </fieldset>
  );
}

/** Add or edit a plan: name, length, price, cardio and an optional note. */
export function PlanFormDialog({ plan, onClose, onSaved }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const isEdit = Boolean(plan);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    const response = await apiRequest(isEdit ? `/api/plans/${plan.id}` : "/api/plans", {
      method: isEdit ? "PATCH" : "POST",
      body: formToObject(event.currentTarget),
    });
    setPending(false);
    if (response.ok) onSaved(response);
    else setResult(response);
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!pending}
      title={isEdit ? `Edit ${plan.name}` : "Add Plan"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="plan-form" variant="primary" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Add Plan"}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={handleSubmit} className={styles.form} noValidate>
        {result?.message && <Alert>{result.message}</Alert>}
        <Input
          id="name"
          label="Plan name"
          required
          defaultValue={plan?.name ?? ""}
          placeholder="e.g. Monthly"
          error={result?.errors?.name}
        />
        <div className={styles.formRow}>
          <Input
            id="durationDays"
            label="Length (days)"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={plan?.duration_days ?? ""}
            placeholder="30"
            error={result?.errors?.durationDays}
          />
          <Input
            id="price"
            label="Price (₹)"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={plan?.price ?? ""}
            placeholder="1500"
            error={result?.errors?.price}
          />
        </div>
        <CardioChoice
          defaultValue={plan ? (plan.includes_cardio ? "yes" : "no") : null}
          error={result?.errors?.includesCardio}
        />
        <Input
          id="description"
          label="Description"
          defaultValue={plan?.description ?? ""}
          placeholder="Optional"
          error={result?.errors?.description}
        />
        {isEdit && (
          <p className={styles.formNote}>
            A new price applies from the next payment. Members already on this
            plan keep the price they paid for their current term.
          </p>
        )}
      </form>
    </Modal>
  );
}

/** Confirmation before taking a plan off sale. */
export function DeletePlanDialog({ plan, onClose, onDeleted }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setPending(true);
    const response = await apiRequest(`/api/plans/${plan.id}`, { method: "DELETE" });
    setPending(false);
    if (response.ok) onDeleted();
    else setError(response.message);
  };

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!pending}
      title={`Delete ${plan.name}?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting…" : "Delete Plan"}
          </Button>
        </>
      }
    >
      <p>
        <strong>{plan.name}</strong> will no longer be offered when adding
        members or recording payments.
        {plan.member_count > 0 &&
          ` The ${plan.member_count} ${
            plan.member_count === 1 ? "member" : "members"
          } already on it keep their plan and history - only new sales stop.`}
      </p>
      {error && (
        <div className={styles.formNote}>
          <Alert>{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
