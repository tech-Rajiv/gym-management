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

/** A phone number as a tap-to-call link: "+91 90000 00001" -> "tel:+919000000001". */
export function telHref(phone) {
  return `tel:${String(phone ?? "").replace(/[^\d+]/g, "")}`;
}

/**
 * A phone number as a WhatsApp chat link. WhatsApp wants the full number in
 * digits only; a bare 10-digit number is taken to be Indian and given +91.
 */
export function whatsAppHref(phone) {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}`;
}
