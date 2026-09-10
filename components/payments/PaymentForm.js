"use client";

import { useActionState, useState } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import { PAYMENT_METHODS, describePayment } from "@/lib/utils/paymentStatus";
import {
  describeMembership,
  getNextTermStartDate,
  getTermEndDate,
} from "@/lib/utils/membershipStatus";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import styles from "./PaymentForm.module.css";

const NEW_TERM = "new";
const CURRENT_TERM = "current";

/**
 * The Record Payment form.
 *
 * Everything it fills in automatically is a starting point, never a rule. The
 * owner knows things the database does not - that a member trained for three
 * days before paying, or that they were given a discount - so every calculated
 * field stays editable:
 *
 *   * the payment date defaults to today, because most payments are entered
 *     the day they happen, but cash taken yesterday is often recorded this
 *     morning;
 *   * a new term starts the day after the last one ended, not today, so a
 *     member who renews three days late is covered for those three days
 *     rather than losing them;
 *   * the amount comes from the plan's price, which is what is usually
 *     charged, not what must be.
 *
 * @param {object[]} members with their current term, from member_overview
 * @param {object[]} plans   the membership plans on sale
 * @param {string}   today   the gym's current date, worked out on the server
 * @param {number}   [preselectedMemberId] when arriving from a member's page
 */
export default function PaymentForm({
  action,
  members,
  plans,
  today,
  preselectedMemberId,
}) {
  const [state, formAction, isPending] = useActionState(action, null);

  const initial = (field, fallback = "") => state?.values?.[field] ?? fallback;
  const errorFor = (field) => state?.errors?.[field];

  const findMember = (id) =>
    members.find((m) => String(m.id) === String(id)) ?? null;
  const findPlan = (id) => plans.find((p) => String(p.id) === String(id)) ?? null;

  const [memberId, setMemberId] = useState(
    String(initial("memberId", preselectedMemberId ?? ""))
  );
  const member = findMember(memberId);

  /** Defaults for a member: what to pay for, and what that would cost. */
  const defaultsFor = (nextMember) => {
    if (!nextMember) {
      return { target: NEW_TERM, planId: "", start: today, end: "", price: "", amount: "" };
    }

    const hasTerm = Boolean(nextMember.membership_id);
    const due = describePayment(
      nextMember.membership_price,
      nextMember.membership_amount_paid
    ).amountDue;

    // Which term this payment is most likely for:
    //
    //   * money owing on a term that is still running  -> that term
    //   * money owing on an expired term, part paid    -> that term, since a
    //     running balance is being settled
    //   * an expired term nobody ever paid for         -> a renewal, which is
    //     the usual reason someone turns up at the desk
    //   * a settled term                               -> a renewal
    //
    // A guess either way is one dropdown change to correct, and the panel
    // above shows the cover and the dues so the owner can see which it is.
    const expired = nextMember.membership_end_date
      ? describeMembership(nextMember.membership_end_date).status === "expired"
      : false;
    const settlingABalance = due > 0 && (!expired || nextMember.membership_amount_paid > 0);

    if (hasTerm && settlingABalance) {
      return {
        target: CURRENT_TERM,
        planId: String(nextMember.membership_plan_id ?? ""),
        start: nextMember.membership_start_date ?? today,
        end: nextMember.membership_end_date ?? "",
        price: String(nextMember.membership_price ?? ""),
        amount: String(due),
      };
    }

    const plan =
      findPlan(nextMember.membership_plan_id) ?? plans[0] ?? null;
    const start = getNextTermStartDate(nextMember.membership_end_date, today);

    return {
      target: NEW_TERM,
      planId: String(plan?.id ?? ""),
      start,
      end: plan ? getTermEndDate(start, plan.duration_days) : "",
      price: String(plan?.price ?? ""),
      amount: String(plan?.price ?? ""),
    };
  };

  const seed = defaultsFor(findMember(memberId));

  const [target, setTarget] = useState(initial("membershipTarget", seed.target));
  const [planId, setPlanId] = useState(String(initial("membershipPlanId", seed.planId)));
  const [startDate, setStartDate] = useState(initial("membershipStartDate", seed.start));
  const [endDate, setEndDate] = useState(initial("membershipEndDate", seed.end));
  const [termPrice, setTermPrice] = useState(String(initial("termPrice", seed.price)));
  const [amount, setAmount] = useState(String(initial("amount", seed.amount)));
  const [method, setMethod] = useState(initial("method", "cash"));
  const [paidOn, setPaidOn] = useState(initial("paidOn", today));

  /** Choosing a member refills everything that depends on them. */
  const handleMemberChange = (event) => {
    const value = event.target.value;
    setMemberId(value);

    const next = defaultsFor(findMember(value));
    setTarget(next.target);
    setPlanId(next.planId);
    setStartDate(next.start);
    setEndDate(next.end);
    setTermPrice(next.price);
    setAmount(next.amount);
  };

  /** Switching between "the current term" and "a new term" re-seeds the dates. */
  const handleTargetChange = (event) => {
    const value = event.target.value;
    setTarget(value);
    if (!member) return;

    if (value === CURRENT_TERM) {
      const due = describePayment(
        member.membership_price,
        member.membership_amount_paid
      ).amountDue;
      setStartDate(member.membership_start_date ?? today);
      setEndDate(member.membership_end_date ?? "");
      setTermPrice(String(member.membership_price ?? ""));
      setAmount(String(due > 0 ? due : member.membership_price ?? ""));
      return;
    }

    const plan = findPlan(planId) ?? findPlan(member.membership_plan_id) ?? plans[0];
    const start = getNextTermStartDate(member.membership_end_date, today);
    setPlanId(String(plan?.id ?? ""));
    setStartDate(start);
    setEndDate(plan ? getTermEndDate(start, plan.duration_days) : "");
    setTermPrice(String(plan?.price ?? ""));
    setAmount(String(plan?.price ?? ""));
  };

  const handlePlanChange = (event) => {
    const value = event.target.value;
    const plan = findPlan(value);
    setPlanId(value);
    if (!plan) return;
    setEndDate(getTermEndDate(startDate, plan.duration_days));
    setTermPrice(String(plan.price));
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

  // --- What the chosen member's cover looks like right now -------------------
  // The owner needs this before deciding: "expired three days ago" is what
  // tells them the new term should start three days ago.
  const cover = member?.membership_end_date
    ? describeMembership(member.membership_end_date)
    : null;
  const dues = member
    ? describePayment(member.membership_price, member.membership_amount_paid)
    : null;

  const memberOptions = members.map((m) => ({
    value: m.id,
    label: `${m.full_name} — ${m.phone}`,
  }));

  const targetOptions = [
    ...(member?.membership_id
      ? [
          {
            value: CURRENT_TERM,
            label: `Current term — ${member.plan_name} (${formatDate(
              member.membership_start_date
            )} to ${formatDate(member.membership_end_date)})`,
          },
        ]
      : []),
    { value: NEW_TERM, label: "New membership term (renewal)" },
  ];

  const planOptions = plans.map((plan) => ({
    value: plan.id,
    label: `${plan.name} — ${plan.duration_days} days, ${formatCurrency(plan.price)}`,
  }));

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state?.message && <Alert variant="danger">{state.message}</Alert>}

      {/* --- Who paid ------------------------------------------------------ */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Member</h2>

        <Select
          id="memberId"
          label="Member"
          required
          placeholder="Select a member"
          options={memberOptions}
          value={memberId}
          onChange={handleMemberChange}
          error={errorFor("memberId")}
        />

        {/* The cover panel. This is the context the owner asked for: how long
            this member is covered, and whether they still owe anything. */}
        {member && (
          <div className={styles.cover}>
            <div className={styles.coverRow}>
              <span className={styles.coverLabel}>Membership</span>
              {cover ? (
                <span className={styles.coverValue}>
                  <Badge variant={cover.variant}>{cover.label}</Badge>
                  <span className={styles.coverDetail}>
                    {cover.daysRemaining < 0
                      ? `Expired on ${formatDate(member.membership_end_date)} — ${Math.abs(
                          cover.daysRemaining
                        )} ${Math.abs(cover.daysRemaining) === 1 ? "day" : "days"} ago`
                      : `Active till ${formatDate(member.membership_end_date)} — ${
                          cover.daysRemaining
                        } ${cover.daysRemaining === 1 ? "day" : "days"} left`}
                  </span>
                </span>
              ) : (
                <span className={styles.coverDetail}>No membership on record</span>
              )}
            </div>

            {dues?.price !== null && (
              <div className={styles.coverRow}>
                <span className={styles.coverLabel}>Dues</span>
                <span className={styles.coverValue}>
                  <Badge variant={dues.variant}>{dues.label}</Badge>
                  <span className={styles.coverDetail}>
                    {formatCurrency(dues.amountPaid)} paid of{" "}
                    {formatCurrency(dues.price)}
                    {dues.amountDue > 0
                      ? ` — ${formatCurrency(dues.amountDue)} still due`
                      : ""}
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* --- What it pays for ---------------------------------------------- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Paying for</h2>

        <Select
          id="membershipTarget"
          label="This payment is for"
          required
          options={targetOptions}
          value={target}
          onChange={handleTargetChange}
          error={errorFor("membershipTarget")}
          disabled={!member}
        />

        {/* Sent so the action knows which term to attach the payment to. */}
        <input
          type="hidden"
          name="membershipId"
          value={isNewTerm ? "" : member?.membership_id ?? ""}
        />

        {isNewTerm ? (
          <>
            <p className={styles.note}>
              A new term starts the day after the last one ended, so no days are
              lost when a member renews late. Change any of these if the member
              actually started on a different day.
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
              <Input
                id="termPrice"
                label="Term price"
                type="number"
                step="0.01"
                min="0"
                required
                value={termPrice}
                onChange={(e) => setTermPrice(e.target.value)}
                hint="From the plan. Change it for a discount."
                error={errorFor("termPrice")}
              />
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
            This payment goes against the member&apos;s existing term. Nothing
            about their membership dates changes.
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
              defaultValue={initial("reference")}
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
          defaultValue={initial("remark")}
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
