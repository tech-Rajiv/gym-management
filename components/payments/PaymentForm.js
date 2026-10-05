"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import CurrentCoverage from "@/components/members/CurrentCoverage";
import SuccessDialog from "@/components/ui/SuccessDialog";
import SearchSelect from "@/components/ui/SearchSelect";
import { DashboardIcon, CardIcon, MembersIcon } from "@/components/ui/icons";
import { PAYMENT_METHODS, describePayment, getMethodLabel } from "@/lib/utils/paymentStatus";
import {
  describeMembership,
  getNextTermStartDate,
  getTermEndDate,
} from "@/lib/utils/membershipStatus";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import { apiRequest, formToObject } from "@/lib/client/api";
import styles from "./PaymentForm.module.css";
import { planOptionLabel, cardioLabel } from "@/lib/utils/plans";

const NEW_TERM = "new";
const CURRENT_TERM = "current";

/**
 * The Record Payment form.
 *
 * The owner is never asked what the payment is for - the form works it out:
 *
 *   * money still owing on the member's current term  -> the payment settles
 *     that balance, and nothing about their dates changes;
 *   * otherwise                                       -> the payment buys the
 *     next term, which starts the day after the current one ends, so a
 *     member who renews three days late is covered for those three days.
 *
 * The price of a new term is the plan's price - shown, never typed - and is
 * looked up again on the server, so it cannot be changed from the browser.
 * The amount received stays editable, which is how part payments work.
 *
 * @param {object[]} members with their current term, from member_overview
 * @param {object[]} plans   the membership plans on sale
 * @param {string}   today   the gym's current date, worked out on the server
 * @param {number}   [preselectedMemberId] when arriving from a member's page
 */
export default function PaymentForm({
  members,
  plans,
  today,
  preselectedMemberId,
}) {
  const router = useRouter();
  const [state, setState] = useState(null);
  const [isPending, setIsPending] = useState(false);
  // The saved payment, once recorded - shown in the success popup.
  const [saved, setSaved] = useState(null);

  const errorFor = (field) => state?.errors?.[field];

  const findMember = (id) =>
    members.find((m) => String(m.id) === String(id)) ?? null;
  const findPlan = (id) => plans.find((p) => String(p.id) === String(id)) ?? null;

  const [memberId, setMemberId] = useState(String(preselectedMemberId ?? ""));
  const member = findMember(memberId);

  /** Defaults for a member: what the payment is for, and what it would cost. */
  const defaultsFor = (nextMember) => {
    if (!nextMember) {
      return { target: NEW_TERM, planId: "", start: today, end: "", amount: "" };
    }

    const due = describePayment(
      nextMember.membership_price,
      nextMember.membership_amount_paid
    ).amountDue;

    // A balance is being settled when something is owed on the current term
    // and it is either still running or was part paid. An expired term nobody
    // ever paid for is treated as a renewal instead - that is the usual reason
    // such a member turns up at the desk.
    const expired = nextMember.membership_end_date
      ? describeMembership(nextMember.membership_end_date, today).status === "expired"
      : false;
    const settlingABalance =
      Boolean(nextMember.membership_id) &&
      due > 0 &&
      (!expired || nextMember.membership_amount_paid > 0);

    if (settlingABalance) {
      return {
        target: CURRENT_TERM,
        planId: String(nextMember.membership_plan_id ?? ""),
        start: nextMember.membership_start_date ?? today,
        end: nextMember.membership_end_date ?? "",
        amount: String(due),
      };
    }

    const plan = findPlan(nextMember.membership_plan_id) ?? plans[0] ?? null;
    const start = getNextTermStartDate(nextMember.membership_end_date, today);

    return {
      target: NEW_TERM,
      planId: String(plan?.id ?? ""),
      start,
      end: plan ? getTermEndDate(start, plan.duration_days) : "",
      amount: String(plan?.price ?? ""),
    };
  };

  const seed = defaultsFor(findMember(memberId));

  const [target, setTarget] = useState(seed.target);
  const [planId, setPlanId] = useState(seed.planId);
  const [startDate, setStartDate] = useState(seed.start);
  const [endDate, setEndDate] = useState(seed.end);
  const [amount, setAmount] = useState(seed.amount);
  const [method, setMethod] = useState("cash");
  const [paidOn, setPaidOn] = useState(today);

  /**
   * Sends the form to POST /api/payments. On success a popup confirms what
   * was recorded and lets the admin choose where to go next.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsPending(true);

    const result = await apiRequest("/api/payments", {
      method: "POST",
      body: formToObject(event.currentTarget),
    });

    if (result.ok) {
      setSaved(result);
      router.refresh(); // so every page reached from the popup is up to date
      return; // Stay "recording" behind the popup.
    }

    setState(result);
    setIsPending(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Choosing a member refills everything that depends on them. */
  const handleMemberChange = (value) => {
    setMemberId(value);

    const next = defaultsFor(findMember(value));
    setTarget(next.target);
    setPlanId(next.planId);
    setStartDate(next.start);
    setEndDate(next.end);
    setAmount(next.amount);
  };

  const handlePlanChange = (event) => {
    const value = event.target.value;
    const plan = findPlan(value);
    setPlanId(value);
    if (!plan) return;
    setEndDate(getTermEndDate(startDate, plan.duration_days));
    setAmount(String(plan.price));
  };

  const handleStartDateChange = (event) => {
    const value = event.target.value;
    setStartDate(value);
    const plan = findPlan(planId);
    if (plan) setEndDate(getTermEndDate(value, plan.duration_days));
  };

  const isNewTerm = target === NEW_TERM;
  const isUpi = method === "upi";

  const selectedPlan = findPlan(planId);
  const dues = member
    ? describePayment(member.membership_price, member.membership_amount_paid)
    : null;

  // Name on the first line; phone and current plan underneath. The phone is
  // also searchable without its spaces, so "9000000014" finds "+91 90000 00014".
  const memberOptions = members.map((m) => {
    const cover = m.membership_end_date ? describeMembership(m.membership_end_date, today) : null;
    return {
      value: m.id,
      label: m.full_name,
      detail: [
        m.phone,
        m.plan_name,
        cover ? `${cover.label} · ends ${formatDate(m.membership_end_date)}` : "No membership",
      ]
        .filter(Boolean)
        .join(" · "),
      search: m.phone.replace(/\D/g, ""),
    };
  });

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: planOptionLabel(plan),
  }));

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {saved && <PaymentSuccess result={saved} />}

      {state?.message && <Alert variant="danger">{state.message}</Alert>}

      {/* --- Who paid ------------------------------------------------------ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Member</h2>

        <SearchSelect
          id="memberId"
          label="Member"
          required
          placeholder="Select a member"
          searchable
          searchPlaceholder="Search by name or phone…"
          emptyText="No member matches that search."
          options={memberOptions}
          value={memberId}
          onChange={handleMemberChange}
          error={errorFor("memberId")}
        />

        {/* Where the member stands right now - the same panel as on their
            profile: covered from, covered till, days left, and dues. */}
        {member && (
          <div className={styles.cover}>
            <CurrentCoverage member={member} referenceDate={today} />
          </div>
        )}
      </section>

      {/* --- What it pays for ---------------------------------------------- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Paying for</h2>

        {/* Worked out from the member, not asked - see the note at the top. */}
        <input type="hidden" name="membershipTarget" value={target} />
        <input
          type="hidden"
          name="membershipId"
          value={isNewTerm ? "" : member?.membership_id ?? ""}
        />

        {!member ? (
          <p className={styles.note}>Choose a member first.</p>
        ) : isNewTerm ? (
          <>
            <p className={styles.note}>
              This payment starts their next membership term, from the day after
              the current one ends - so no days are lost when someone renews late.
            </p>

            <div className={styles.grid}>
              <Select
                id="membershipPlanId"
                label="Plan"
                required
                placeholder="Select a plan"
                options={planOptions}
                value={planId}
                onChange={handlePlanChange}
                error={errorFor("membershipPlanId")}
              />
              <div className={styles.planPrice}>
                <span className={styles.planPriceLabel}>Plan price</span>
                <span className={styles.planPriceValue}>
                  {selectedPlan ? formatCurrency(selectedPlan.price) : "—"}
                </span>
                {selectedPlan && (
                  <span className={styles.planPriceHint}>
                    {selectedPlan.duration_days} days · {cardioLabel(selectedPlan.includes_cardio)}
                  </span>
                )}
              </div>
              <Input
                id="membershipStartDate"
                label="Membership starts"
                type="date"
                required
                value={startDate}
                onChange={handleStartDateChange}
                error={errorFor("membershipStartDate")}
              />
              <Input
                id="membershipEndDate"
                label="Membership ends"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                hint="Worked out from the plan's length."
                error={errorFor("membershipEndDate")}
              />
            </div>
          </>
        ) : (
          <p className={styles.note}>
            <strong>{formatCurrency(dues.amountDue)}</strong> is still due on the
            current {member.plan_name} term ({formatDate(member.membership_start_date)} –{" "}
            {formatDate(member.membership_end_date)}). This payment settles that
            balance; their membership dates stay the same.
          </p>
        )}
      </section>

      {/* --- The money ------------------------------------------------------ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Payment</h2>

        <div className={styles.grid}>
          <Input
            id="amount"
            label="Amount received"
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint="Enter less than the full price to record a part payment."
            error={errorFor("amount")}
          />
          <Input
            id="paidOn"
            label="Payment date"
            type="date"
            required
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            hint="The day the money was received, not the day you enter it."
            error={errorFor("paidOn")}
          />
          <Select
            id="method"
            label="Method"
            required
            options={PAYMENT_METHODS}
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            error={errorFor("method")}
          />
          {isUpi && (
            <Input
              id="reference"
              label="Transaction / UTR"
              placeholder="e.g. 452901873364"
              hint="Optional."
              error={errorFor("reference")}
            />
          )}
        </div>

        {!isUpi && (
          <p className={styles.note}>
            Cash needs no transaction reference. Add a note below if you want to
            record a receipt number or who took the money.
          </p>
        )}

        <Input
          id="remark"
          label="Remark"
          multiline
          rows={3}
          placeholder="Optional note about this payment"
          error={errorFor("remark")}
        />
      </section>

      <div className={styles.footer}>
        <Button href="/payments" variant="ghost" type="button">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Recording…" : "Record Payment"}
        </Button>
      </div>
    </form>
  );
}

/** The popup shown once a payment is recorded. */
function PaymentSuccess({ result }) {
  const r = result.receipt ?? {};
  const name = r.member_name ?? "the member";

  return (
    <SuccessDialog
      title="Payment successful"
      subtitle={`${formatCurrency(r.amount)} received from ${name}`}
      details={[
        { label: "Member", value: r.member_name },
        { label: "Amount", value: formatCurrency(r.amount) },
        { label: "Method", value: r.method ? getMethodLabel(r.method) : null },
        { label: "UTR", value: r.reference },
        { label: "Paid on", value: r.paid_on ? formatDate(r.paid_on) : null },
        { label: "Plan", value: r.plan_name },
        {
          label: "Covers",
          value:
            r.membership_start_date && r.membership_end_date
              ? `${formatDate(r.membership_start_date)} → ${formatDate(r.membership_end_date)}`
              : null,
        },
        { label: "Remark", value: r.remark },
      ]}
      actions={[
        {
          href: `/members/${result.memberId}`,
          label: `View ${name}`,
          variant: "primary",
          icon: MembersIcon,
        },
        { href: "/payments", label: "Payment History", icon: CardIcon },
        { href: "/dashboard", label: "Back to Home", icon: DashboardIcon },
      ]}
    />
  );
}
