"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import SuccessDialog from "@/components/ui/SuccessDialog";
import { GENDER_OPTIONS } from "@/lib/config";
import { addDays, formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import { PAYMENT_METHODS, getMethodLabel } from "@/lib/utils/paymentStatus";
import { DashboardIcon, CardIcon, MembersIcon } from "@/components/ui/icons";
import { memberToFormValues } from "@/lib/validations/member";
import { apiRequest, formToObject } from "@/lib/client/api";
import styles from "./MemberForm.module.css";
import { planOptionLabel, cardioLabel } from "@/lib/utils/plans";

/**
 * The Add Member and Edit Member form.
 *
 * One component serves both. Given an existing `member` it sends
 * PATCH /api/members/:id; without one it sends POST /api/members.
 *
 * Adding a member also takes their joining payment - cash or UPI, and the
 * date - because a member joins by paying. The amount is always the chosen
 * plan's full price (the gym does not take part payments), so it is shown,
 * not typed, and the server takes it from the plan. The API saves the member,
 * their first term and that payment together, and the form then shows a
 * success popup with what was saved and where to go next.
 *
 * Editing moves straight on to the member's page. On failure the API answers
 * with `{ errors, message }` and the form shows each message against its
 * field. Nothing typed is lost, because the inputs are never reset.
 *
 * @param {object}  [member] existing member, when editing
 * @param {object[]} plans   membership plans to choose from
 * @param {string}  today    the gym's current date, worked out on the server
 */
export default function MemberForm({ member, plans, today, submitLabel = "Save Member" }) {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const saved = memberToFormValues(member);

  /** What a field starts with: the saved member when editing, else empty. */
  const initial = (field) => saved[field] ?? "";

  const errorFor = (field) => state?.errors?.[field];

  // The membership dates are the only fields held in state, because choosing a
  // plan fills the end date in automatically.
  const [planId, setPlanId] = useState(String(initial("membershipPlanId") ?? ""));
  const [startDate, setStartDate] = useState(initial("membershipStartDate") || today);
  const [endDate, setEndDate] = useState(initial("membershipEndDate") || "");

  // Adding only: the joining payment. Its amount is the plan's price.
  const isNew = !member;
  const [method, setMethod] = useState("cash");
  const [created, setCreated] = useState(null);
  const selectedPlan = plans.find((option) => String(option.id) === String(planId)) ?? null;

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsPending(true);

    const result = await apiRequest(member ? `/api/members/${member.id}` : "/api/members", {
      method: member ? "PATCH" : "POST",
      body: formToObject(event.currentTarget),
    });

    if (result.ok) {
      router.refresh(); // so every page reached next is up to date
      if (isNew) {
        setCreated(result);
        return; // Stay "saving" behind the success popup.
      }
      router.push(`/members/${result.id}`);
      return; // Stay "saving" while the member's page loads.
    }

    setState(result);
    setIsPending(false);
    // The first problem may be well above the button that was just pressed.
    window.scrollTo({ top: 0, behavior: "smooth" });
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
    label: planOptionLabel(plan),
  }));

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {created && <MemberCreated result={created} />}

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
          <Input
            id="joinDate"
            label="Join Date"
            type="date"
            required
            defaultValue={initial("joinDate") || today}
            error={errorFor("joinDate")}
            hint="When they first joined the gym"
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
        <h2 className={styles.sectionTitle}>Membership</h2>
        <p className={styles.sectionHint}>
          Choosing a plan fills in the end date automatically. You can still
          change it if this membership runs to a different date.
        </p>

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

        {/* Start and end side by side on every screen, so the term reads as
            one "from - to" pair. */}
        <div className={styles.dateRow}>
          <Input
            id="membershipStartDate"
            label="Membership Start"
            type="date"
            required
            value={startDate}
            onChange={handleStartDateChange}
            error={errorFor("membershipStartDate")}
          />
          <Input
            id="membershipEndDate"
            label="Membership End"
            type="date"
            required
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            error={errorFor("membershipEndDate")}
          />
        </div>
      </section>

      {isNew && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Joining Payment</h2>
          <p className={styles.sectionHint}>
            What the member paid for this first membership. It is recorded as a
            payment together with the member.
          </p>

          <div className={styles.grid}>
            <div className={styles.planPrice}>
              <span className={styles.planPriceLabel}>Plan price</span>
              <span className={styles.planPriceValue}>
                {selectedPlan ? formatCurrency(selectedPlan.price) : "Choose a plan"}
              </span>
              {selectedPlan && (
                <span className={styles.planPriceHint}>
                  {selectedPlan.name} · {selectedPlan.duration_days} days ·{" "}
                  {cardioLabel(selectedPlan.includes_cardio)}
                </span>
              )}
            </div>
            <Select
              id="method"
              label="Method"
              required
              options={PAYMENT_METHODS}
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              error={errorFor("method")}
            />
            <Input
              id="paidOn"
              label="Payment date"
              type="date"
              required
              defaultValue={today}
              error={errorFor("paidOn")}
            />
            {method === "upi" && (
              <Input
                id="reference"
                label="Transaction / UTR"
                placeholder="e.g. 452901873364"
                hint="Optional."
                error={errorFor("reference")}
              />
            )}
          </div>
        </section>
      )}

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

/** The popup shown once a new member, their membership and payment are saved. */
function MemberCreated({ result }) {
  const { member: m = {}, payment: p = {} } = result;

  return (
    <SuccessDialog
      title="New member added"
      subtitle={`${m.fullName} has joined, and their payment is recorded.`}
      details={[
        { label: "Member", value: m.fullName },
        { label: "Phone", value: m.phone },
        { label: "Plan", value: m.plan },
        {
          label: "Covers",
          value: m.termStart && m.termEnd
            ? `${formatDate(m.termStart)} → ${formatDate(m.termEnd)}`
            : null,
        },
        {
          label: "Paid",
          value: p.amount !== undefined
            ? `${formatCurrency(p.amount)} by ${getMethodLabel(p.method)}`
            : null,
        },
        { label: "UTR", value: p.reference },
        { label: "Paid on", value: p.paidOn ? formatDate(p.paidOn) : null },
      ]}
      actions={[
        {
          href: `/members/${result.id}`,
          label: "View Member Details",
          variant: "primary",
          icon: MembersIcon,
        },
        { href: "/payments", label: "Payment History", icon: CardIcon },
        { href: "/dashboard", label: "Back to Home", icon: DashboardIcon },
      ]}
    />
  );
}
