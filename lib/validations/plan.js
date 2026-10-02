/**
 * Membership plan validation, run by the API routes.
 *
 * Returns plain objects rather than throwing, so the Plans form can show each
 * message against its field.
 */

const MAX_PRICE = 10_000_000; // A sanity ceiling, not a business rule.
const MAX_DAYS = 3650; // Ten years.

function clean(value) {
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * @param {object} body the form's fields sent as JSON
 * @returns {{ valid: boolean, errors: object, values: object }}
 */
export function validatePlan(body = {}) {
  const name = clean(body.name);
  const description = clean(body.description);
  const durationDays = Number(clean(body.durationDays));
  const price = Number(clean(body.price));
  const errors = {};

  if (!name) errors.name = "Plan name is required.";
  else if (name.length > 60) errors.name = "Keep the name under 60 characters.";

  if (!clean(body.durationDays)) errors.durationDays = "Length in days is required.";
  else if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > MAX_DAYS)
    errors.durationDays = "Enter a whole number of days, from 1 to 3650.";

  if (clean(body.price) === null) errors.price = "Price is required.";
  else if (!Number.isFinite(price) || price < 0) errors.price = "Enter a valid price.";
  else if (price > MAX_PRICE) errors.price = "That price looks too large. Check the figure.";

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: { name, description, durationDays, price },
  };
}
