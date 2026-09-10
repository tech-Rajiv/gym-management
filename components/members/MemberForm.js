"use client";

import { useActionState, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { GENDER_OPTIONS } from "@/lib/config";
import { addDays } from "@/lib/utils/dates";
import { memberToFormValues } from "@/lib/validations/member";
import styles from "./MemberForm.module.css";

/**
 * The Add Member and Edit Member form.
 *
 * One component serves both. The page above decides which Server Action to
 * hand it - createMemberAction, or updateMemberAction already bound to a
 * member id - so the form itself does not know or care which it is doing.
 *
 * `useActionState` calls the action and gives back whatever it returned. On a
 * successful save the action redirects and this component never sees a result;
 * on a failure it gets `{ errors, values }` and re-renders with the messages
 * in place and the typed values still there.
 *
 * @param {object}  [member] existing member, when editing
 * @param {object[]} plans   membership plans to choose from
 * @param {string}  today    the gym's current date, worked out on the server
 */
export default function MemberForm({ action, member, plans, today, submitLabel = "Save Member" }) {
  const [state, formAction, isPending] = useActionState(action, null);

  const saved = memberToFormValues(member);

  /**
   * What a field should show: the value from a rejected submission first, so
   * nothing typed is lost, then the saved member, then empty.
   */
  const initial = (field) => state?.values?.[field] ?? saved[field] ?? "";

  const errorFor = (field) => state?.errors?.[field];

  // The membership dates are the only fields held in state, because choosing a
  // plan fills the end date in automatically.
  const [planId, setPlanId] = useState(String(initial("membershipPlanId") ?? ""));
  const [startDate, setStartDate] = useState(initial("membershipStartDate") || today);
  const [endDate, setEndDate] = useState(initial("membershipEndDate") || "");

  /**
   * Works out the end date from the plan's length.
   *
   * A 30-day plan starting on the 1st ends on the 30th, not the 31st - the
   * start day is day one, so the last day is start + duration - 1.
   */
  const calculateEndDate = (planIdValue, start) => {
    const plan = plans.find((option) => String(option.id) === String(planIdValue));
    if (!plan || !start) return "";
    return addDays(start, plan.duration_days - 1);
  };

  const handlePlanChange = (event) => {
    const value = event.target.value;
    setPlanId(value);
    setEndDate(calculateEndDate(value, startDate));
  };

  const handleStartDateChange = (event) => {
    const value = event.target.value;
    setStartDate(value);
    setEndDate(calculateEndDate(planId, value));
  };

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} — ${plan.duration_days} days`,
  }));

  return (
    <form action={formAction} className={styles.form} noValidate>
      {/* A failure the form cannot pin on one field, such as the member having
          been deleted in another tab. */}
      {state?.message && <Alert>{state.message}</Alert>}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Personal Details</h2>
        <p className={styles.sectionHint}>Who the member is.</p>

        <div className={styles.grid}>
          <Input
            id="firstName"
            label="First Name"
            required
            defaultValue={initial("firstName")}
            error={errorFor("firstName")}
            autoComplete="given-name"
          />
          <Input
            id="lastName"
            label="Last Name"
            required
            defaultValue={initial("lastName")}
            error={errorFor("lastName")}
            autoComplete="family-name"
          />
          <Select
            id="gender"
            label="Gender"
            options={GENDER_OPTIONS}
            placeholder="Select gender"
            defaultValue={initial("gender")}
            error={errorFor("gender")}
          />
          <Input
            id="dateOfBirth"
            label="Date of Birth"
            type="date"
            defaultValue={initial("dateOfBirth")}
            error={errorFor("dateOfBirth")}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Contact</h2>
        <p className={styles.sectionHint}>
          Phone is required and must be unique — it is how members are identified.
        </p>

        <div className={styles.grid}>
          <Input
            id="phone"
            label="Phone"
            type="tel"
            required
            defaultValue={initial("phone")}
            error={errorFor("phone")}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
          <Input
            id="email"
            label="Email"
            type="email"
            defaultValue={initial("email")}
            error={errorFor("email")}
            placeholder="member@example.com"
            autoComplete="email"
          />
          <Input
            id="address"
            label="Address"
            multiline
            rows={2}
            defaultValue={initial("address")}
            error={errorFor("address")}
            className={styles.full}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Emergency Contact</h2>
        <p className={styles.sectionHint}>Who to call if something happens at the gym.</p>

        <div className={styles.grid}>
          <Input
            id="emergencyContactName"
            label="Contact Name"
            defaultValue={initial("emergencyContactName")}
            error={errorFor("emergencyContactName")}
          />
          <Input
            id="emergencyContactPhone"
            label="Contact Phone"
            type="tel"
            defaultValue={initial("emergencyContactPhone")}
            error={errorFor("emergencyContactPhone")}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Membership</h2>
        <p className={styles.sectionHint}>
          Choosing a plan fills in the end date automatically. You can still
          change it if this membership runs to a different date.
        </p>

        <div className={styles.gridThree}>
          <Select
            id="membershipPlanId"
            label="Membership Plan"
            required
            options={planOptions}
            placeholder="Select a plan"
            value={planId}
            onChange={handlePlanChange}
            error={errorFor("membershipPlanId")}
          />
          <Input
            id="joinDate"
            label="Join Date"
            type="date"
            required
            defaultValue={initial("joinDate") || today}
            error={errorFor("joinDate")}
            hint="When they first joined the gym"
          />
          {/* Keeps the two membership dates together on the row below on
              desktop. It collapses away once the grid is a single column. */}
          <div className={styles.spacer} />
          <Input
            id="membershipStartDate"
            label="Membership Start Date"
            type="date"
            required
            value={startDate}
            onChange={handleStartDateChange}
            error={errorFor("membershipStartDate")}
          />
          <Input
            id="membershipEndDate"
            label="Membership End Date"
            type="date"
            required
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            error={errorFor("membershipEndDate")}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notes</h2>
        <p className={styles.sectionHint}>
          Anything worth remembering — injuries, goals, preferred timings.
        </p>

        <Input
          id="notes"
          label="Notes"
          multiline
          rows={3}
          defaultValue={initial("notes")}
          error={errorFor("notes")}
        />
      </section>

      <div className={styles.footer}>
        <Button href={member ? `/members/${member.id}` : "/members"} variant="ghost">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
