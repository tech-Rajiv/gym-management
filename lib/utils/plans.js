import { formatCurrency } from "@/lib/utils/format";

/**
 * How a plan is named wherever one is picked or listed.
 *
 * Cardio is the main thing that sets two plans of the same length apart, so
 * it is always spelled out next to the plan rather than left to a description.
 */

/** "Cardio included" or "No cardio". */
export function cardioLabel(includesCardio) {
  return includesCardio ? "Cardio included" : "No cardio";
}

/** "Monthly — 30 days, ₹600 · Cardio included", for the plan dropdowns. */
export function planOptionLabel(plan) {
  return `${plan.name} — ${plan.duration_days} days, ${formatCurrency(plan.price)} · ${cardioLabel(
    plan.includes_cardio
  )}`;
}

/**
 * "Aushi, Rahul +6 more", from the first few names and the total - for the
 * plan cards. Null when nobody is on the plan.
 */
export function memberPreview(names = [], total = 0) {
  if (!total) return null;
  const shown = (names ?? []).filter(Boolean);
  const more = total - shown.length;
  return more > 0 ? `${shown.join(", ")} +${more} more` : shown.join(", ");
}
