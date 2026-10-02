/**
 * Payment status.
 *
 * Like the Active / Expired badge, this is never stored. It is worked out by
 * comparing what has been received against what the term costs, so it cannot
 * go stale when another payment is recorded.
 *
 * This module is the single source of truth for that rule. The members table,
 * the payment history and any future dues report should call
 * `getPaymentStatus` rather than compare amounts themselves.
 */

/** How money is taken. The database has the same list as a CHECK constraint. */
export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
];

export const PAYMENT_STATUS = {
  PAID: "paid",
  PARTIAL: "partial",
  UNPAID: "unpaid",
  NONE: "none",
};

const STATUS_LABELS = {
  [PAYMENT_STATUS.PAID]: "Paid",
  [PAYMENT_STATUS.PARTIAL]: "Partial",
  [PAYMENT_STATUS.UNPAID]: "Unpaid",
  [PAYMENT_STATUS.NONE]: "—",
};

const STATUS_VARIANTS = {
  [PAYMENT_STATUS.PAID]: "success",
  [PAYMENT_STATUS.PARTIAL]: "warning",
  [PAYMENT_STATUS.UNPAID]: "danger",
  [PAYMENT_STATUS.NONE]: "neutral",
};

/**
 * Where a membership term stands financially.
 *
 * Amounts are compared with a small tolerance because they are decimals: a
 * term of 4000 paid as 1333.33 three times should read as settled, not as one
 * paisa short.
 *
 * @param {number|null} price      what the term costs
 * @param {number} amountPaid      total received against it so far
 */
export function getPaymentStatus(price, amountPaid = 0) {
  if (price === null || price === undefined) return PAYMENT_STATUS.NONE;

  const paid = Number(amountPaid) || 0;
  const owed = Number(price) || 0;

  if (paid <= 0) return PAYMENT_STATUS.UNPAID;
  if (paid + 0.01 >= owed) return PAYMENT_STATUS.PAID;
  return PAYMENT_STATUS.PARTIAL;
}

/** What is still owed on a term, never negative. */
export function getAmountDue(price, amountPaid = 0) {
  const due = (Number(price) || 0) - (Number(amountPaid) || 0);
  return due > 0 ? due : 0;
}

export function getPaymentLabel(status) {
  return STATUS_LABELS[status] ?? STATUS_LABELS[PAYMENT_STATUS.NONE];
}

export function getPaymentVariant(status) {
  return STATUS_VARIANTS[status] ?? "neutral";
}

/** Human label for a method value, e.g. "upi" -> "UPI". */
export function getMethodLabel(method) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

/**
 * Everything the UI needs about a term's payment standing, in one call.
 * Components take this and render - they do no arithmetic of their own.
 */
export function describePayment(price, amountPaid = 0) {
  const status = getPaymentStatus(price, amountPaid);
  return {
    status,
    label: getPaymentLabel(status),
    variant: getPaymentVariant(status),
    amountPaid: Number(amountPaid) || 0,
    price: price === null || price === undefined ? null : Number(price),
    amountDue: getAmountDue(price, amountPaid),
  };
}
