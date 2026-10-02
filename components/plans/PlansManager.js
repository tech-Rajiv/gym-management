"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { apiRequest, formToObject } from "@/lib/client/api";
import { formatCurrency } from "@/lib/utils/format";
import { PlusIcon, EditIcon, TrashIcon, MembersIcon, CalendarIcon } from "@/components/ui/icons";
import styles from "./PlansManager.module.css";

/** One of four accent colours per card, so the plans are told apart at a glance. */
const ACCENTS = ["primary", "success", "warning", "danger"];

/**
 * The Plans page: a card per plan, with Add, Edit and Delete.
 *
 * A Client Component because adding and editing happen in dialogs. The plans
 * themselves were loaded on the server; after any change the page refreshes
 * from the server rather than patching local state.
 */
export default function PlansManager({ plans }) {
  const router = useRouter();
  // { mode: 'add' | 'edit' | 'delete', plan? } while a dialog is open.
  const [dialog, setDialog] = useState(null);

  const close = () => setDialog(null);
  const done = () => {
    setDialog(null);
    router.refresh();
  };

  return (
    <div>
      <PageHeader
        title="Membership Plans"
        description="What the gym sells. These plans and prices are used when adding members and recording payments."
        actions={
          <Button variant="primary" onClick={() => setDialog({ mode: "add" })}>
            <PlusIcon size={16} />
            Add Plan
          </Button>
        }
      />

      {plans.length === 0 ? (
        <div className={styles.emptyCard}>
          <EmptyState
            icon={<CalendarIcon size={20} />}
            title="No plans on sale."
            description="Add a plan before adding members or recording payments."
          />
        </div>
      ) : (
        <div className={styles.grid}>
          {plans.map((plan, index) => (
            <article key={plan.id} className={`${styles.plan} ${styles[ACCENTS[index % ACCENTS.length]]}`}>
              <div className={styles.planTop}>
                <h2 className={styles.planName}>{plan.name}</h2>
                <span className={styles.duration}>{plan.duration_days} days</span>
              </div>

              <p className={styles.price}>{formatCurrency(plan.price)}</p>
              {plan.description && <p className={styles.description}>{plan.description}</p>}

              <p className={styles.usage}>
                <MembersIcon size={15} />
                {plan.member_count} {plan.member_count === 1 ? "member" : "members"} on this plan
              </p>

              <div className={styles.planActions}>
                <Button variant="secondary" onClick={() => setDialog({ mode: "edit", plan })}>
                  <EditIcon size={15} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  className={styles.deleteButton}
                  onClick={() => setDialog({ mode: "delete", plan })}
                >
                  <TrashIcon size={15} />
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(dialog?.mode === "add" || dialog?.mode === "edit") && (
        <PlanFormDialog plan={dialog.plan} onClose={close} onSaved={done} />
      )}
      {dialog?.mode === "delete" && (
        <DeletePlanDialog plan={dialog.plan} onClose={close} onDeleted={done} />
      )}
    </div>
  );
}

/** Add or edit a plan: name, length in days, price and an optional note. */
function PlanFormDialog({ plan, onClose, onSaved }) {
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
    if (response.ok) onSaved();
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
function DeletePlanDialog({ plan, onClose, onDeleted }) {
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
