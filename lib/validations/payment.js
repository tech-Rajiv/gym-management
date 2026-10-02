/**
 * Payment form validation.
 *
 * Runs on the server inside the API route, so it cannot be skipped by anything
 * the browser does. It returns plain objects rather than throwing, so the
 * form can put each message next to the field it belongs to.
 */

import { isValidDate } from "@/lib/utils/dates";
import { PAYMENT_METHODS } from "@/lib/utils/paymentStatus";

const MAX_AMOUNT = 10_000_000; // A sanity ceiling, not a business rule.

/**
 * Trims a value and turns blanks into null, so optional fields stay NULL.
 * Anything that is not a string or a number is treated as missing.
 */
function clean(value) {
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Checks a payment submission - the form's fields sent as JSON - and returns
 * the values ready for the database.
 *
 * @returns {{ valid: boolean, errors: object, data: object }}
 */
export function validatePayment(body = {}) {
  const errors = {};

  const raw = {
    memberId: clean(body.memberId),
    membershipTarget: clean(body.membershipTarget),
    membershipId: clean(body.membershipId),
    membershipPlanId: clean(body.membershipPlanId),
    membershipStartDate: clean(body.membershipStartDate),
    membershipEndDate: clean(body.membershipEndDate),
    amount: clean(body.amount),
    method: clean(body.method),
    paidOn: clean(body.paidOn),
    reference: clean(body.reference),
    remark: clean(body.remark),
  };

  // --- Member ---------------------------------------------------------------
  const memberId = Number(raw.memberId);
  if (!raw.memberId || !Number.isInteger(memberId) || memberId <= 0) {
    errors.memberId = "Choose the member this payment is from.";
  }

  // --- Amount ---------------------------------------------------------------
  const amount = Number(raw.amount);
  if (raw.amount === null) {
    errors.amount = "Amount is required.";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  } else if (amount > MAX_AMOUNT) {
    errors.amount = "That amount looks too large. Check the figure.";
  }

  // --- Method ---------------------------------------------------------------
  const isKnownMethod = PAYMENT_METHODS.some((m) => m.value === raw.method);
  if (!isKnownMethod) errors.method = "Choose how the payment was made.";

  // --- Payment date ---------------------------------------------------------
  // Deliberately allows past dates: cash taken yesterday is often entered the
  // next morning. Future dates are rejected as almost certainly a typo.
  if (!raw.paidOn) {
    errors.paidOn = "Payment date is required.";
  } else if (!isValidDate(raw.paidOn)) {
    errors.paidOn = "Enter a valid payment date.";
  }

  // --- What the payment is for ---------------------------------------------
  const isNewTerm = raw.membershipTarget === "new";

  if (isNewTerm) {
    const planId = Number(raw.membershipPlanId);
    if (!raw.membershipPlanId || !Number.isInteger(planId) || planId <= 0) {
      errors.membershipPlanId = "Choose a membership plan for the new term.";
    }

    if (!raw.membershipStartDate) {
      errors.membershipStartDate = "Membership start date is required.";
    } else if (!isValidDate(raw.membershipStartDate)) {
      errors.membershipStartDate = "Enter a valid start date.";
    }

    if (!raw.membershipEndDate) {
      errors.membershipEndDate = "Membership end date is required.";
    } else if (!isValidDate(raw.membershipEndDate)) {
      errors.membershipEndDate = "Enter a valid end date.";
    }

    if (
      !errors.membershipStartDate &&
      !errors.membershipEndDate &&
      raw.membershipEndDate < raw.membershipStartDate
    ) {
      errors.membershipEndDate = "End date must be on or after the start date.";
    }

    // No term price is read from the form: a new term costs what its plan
    // costs, and the API route looks that up in the database.
  } else {
    const membershipId = Number(raw.membershipId);
    if (!raw.membershipId || !Number.isInteger(membershipId) || membershipId <= 0) {
      errors.membershipTarget = "Choose which membership this payment is for.";
    }
  }

  // --- UPI reference --------------------------------------------------------
  // A reference on a cash payment is dropped rather than rejected: the field is
  // simply not applicable, and the database enforces the same rule.
  const reference = raw.method === "upi" ? raw.reference : null;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      memberId,
      isNewTerm,
      membershipId: isNewTerm ? null : Number(raw.membershipId),
      membershipPlanId: isNewTerm ? Number(raw.membershipPlanId) : null,
      membershipStartDate: raw.membershipStartDate,
      membershipEndDate: raw.membershipEndDate,
      termPrice: null, // filled in from the plan by the API route
      amount,
      method: raw.method,
      paidOn: raw.paidOn,
      reference,
      remark: raw.remark,
    },
  };
}
