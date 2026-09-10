/**
 * Small display helpers.
 * Formatting lives here so components stay about layout, not string handling.
 */

/** Formats a price as Indian rupees, e.g. 1500 -> "₹1,500". */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Falls back to an em dash so empty table cells still line up. */
export function orDash(value) {
  return value === null || value === undefined || value === "" ? "—" : value;
}

/** First letters of a name, for the avatar circle: "Rahul Patel" -> "RP". */
export function getInitials(firstName = "", lastName = "") {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
}

/** Turns a stored value into a readable label, e.g. "male" -> "Male". */
export function titleCase(value) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
