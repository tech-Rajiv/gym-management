/**
 * Member form validation.
 *
 * Runs on the server inside the API route, because that is the only place it
 * cannot be bypassed. The browser's own `required` attributes are a
 * convenience on top of this, not a replacement for it.
 *
 * `validateMember` both checks and cleans: it returns the normalised values
 * ready for the database, so the repository never has to think about empty
 * strings or stray whitespace.
 */

import { GENDER_OPTIONS } from "@/lib/config";
import { isValidDate, today } from "@/lib/utils/dates";
import { PAYMENT_METHODS } from "@/lib/utils/paymentStatus";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Deliberately loose: gyms record numbers with spaces, +91 prefixes and dashes.
const PHONE_PATTERN = /^[+]?[\d\s-]{7,20}$/;

const VALID_GENDERS = GENDER_OPTIONS.map((option) => option.value);

/**
 * Trims a value, turning blanks into null so the database stores NULL.
 * The body is JSON from the browser, so anything that is not a string or a
 * number is treated as missing rather than trusted.
 */
function clean(value) {
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Pulls the member fields out of a submitted body - the form's fields sent as
 * JSON. Anything else in the body is ignored.
 */
export function parseMemberForm(body = {}) {
  return {
    firstName: clean(body.firstName),
    lastName: clean(body.lastName),
    phone: clean(body.phone),
    email: clean(body.email),
    gender: clean(body.gender),
    dateOfBirth: clean(body.dateOfBirth),
    address: clean(body.address),
    emergencyContactName: clean(body.emergencyContactName),
    emergencyContactPhone: clean(body.emergencyContactPhone),
    notes: clean(body.notes),
    membershipPlanId: clean(body.membershipPlanId),
    joinDate: clean(body.joinDate),
    membershipStartDate: clean(body.membershipStartDate),
    membershipEndDate: clean(body.membershipEndDate),
  };
}

/**
 * Checks a parsed member.
 *
 * @returns {{ valid: boolean, errors: Record<string,string>, values: object }}
 *          `errors` is keyed by field name so the form can show each message
 *          against the input it belongs to.
 */
export function validateMember(input) {
  const errors = {};

  // --- Required identity fields ---------------------------------------------
  if (!input.firstName) {
    errors.firstName = "First name is required.";
  } else if (input.firstName.length > 80) {
    errors.firstName = "First name is too long.";
  }

  if (!input.lastName) {
    errors.lastName = "Last name is required.";
  } else if (input.lastName.length > 80) {
    errors.lastName = "Last name is too long.";
  }

  if (!input.phone) {
    errors.phone = "Phone number is required.";
  } else if (!PHONE_PATTERN.test(input.phone)) {
    errors.phone = "Enter a valid phone number.";
  }

  // --- Optional fields, checked only when filled in --------------------------
  if (input.email && !EMAIL_PATTERN.test(input.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (input.gender && !VALID_GENDERS.includes(input.gender)) {
    errors.gender = "Select a valid option.";
  }

  if (input.dateOfBirth) {
    if (!isValidDate(input.dateOfBirth)) {
      errors.dateOfBirth = "Enter a valid date.";
    } else if (input.dateOfBirth > today()) {
      errors.dateOfBirth = "Date of birth cannot be in the future.";
    }
  }

  if (input.emergencyContactPhone && !PHONE_PATTERN.test(input.emergencyContactPhone)) {
    errors.emergencyContactPhone = "Enter a valid phone number.";
  }

  // --- Membership -----------------------------------------------------------
  if (!input.membershipPlanId) {
    errors.membershipPlanId = "Membership plan is required.";
  } else if (!/^\d+$/.test(input.membershipPlanId)) {
    errors.membershipPlanId = "Select a valid membership plan.";
  }

  if (!input.joinDate) {
    errors.joinDate = "Join date is required.";
  } else if (!isValidDate(input.joinDate)) {
    errors.joinDate = "Enter a valid date.";
  }

  if (!input.membershipStartDate) {
    errors.membershipStartDate = "Membership start date is required.";
  } else if (!isValidDate(input.membershipStartDate)) {
    errors.membershipStartDate = "Enter a valid date.";
  }

  if (!input.membershipEndDate) {
    errors.membershipEndDate = "Membership end date is required.";
  } else if (!isValidDate(input.membershipEndDate)) {
    errors.membershipEndDate = "Enter a valid date.";
  }

  // Only worth comparing once both dates are known to be real dates.
  if (
    !errors.membershipStartDate &&
    !errors.membershipEndDate &&
    input.membershipEndDate < input.membershipStartDate
  ) {
    errors.membershipEndDate = "End date must be on or after the start date.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      ...input,
      // The database column is an integer; the form gives us a string.
      membershipPlanId: input.membershipPlanId ? Number(input.membershipPlanId) : null,
    },
  };
}

const MAX_AMOUNT = 10_000_000; // A sanity ceiling, not a business rule.

/**
 * Checks the joining payment taken when a new member is added.
 *
 * A member joins by paying, so adding one always records a payment for their
 * first term: how much was received, by cash or UPI, and when. The amount may
 * be less than the plan's price - that is a part payment, and the rest shows
 * as due.
 *
 * @returns {{ valid: boolean, errors: object, values: object }}
 */
export function validateJoiningPayment(body = {}) {
  const errors = {};
  const rawAmount = clean(body.amount);
  const amount = Number(rawAmount);
  const method = clean(body.method);
  const paidOn = clean(body.paidOn);

  if (rawAmount === null) {
    errors.amount = "Amount received is required.";
  } else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
  } else if (amount > MAX_AMOUNT) {
    errors.amount = "That amount looks too large. Check the figure.";
  }

  if (!PAYMENT_METHODS.some((option) => option.value === method)) {
    errors.method = "Choose how the payment was made.";
  }

  if (!paidOn) {
    errors.paidOn = "Payment date is required.";
  } else if (!isValidDate(paidOn)) {
    errors.paidOn = "Enter a valid payment date.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values: {
      amount,
      method,
      paidOn,
      // A UTR only means something for UPI; the database enforces the same.
      reference: method === "upi" ? clean(body.reference) : null,
    },
  };
}

/**
 * Maps a member row from the database onto the form's field names.
 *
 * The database uses snake_case and the form uses camelCase, and the current
 * membership arrives on the same row from the `member_overview` view. Doing
 * the translation here keeps that knowledge next to `parseMemberForm`, which
 * does the same job in the other direction.
 */
export function memberToFormValues(member) {
  if (!member) return {};

  return {
    firstName: member.first_name,
    lastName: member.last_name,
    phone: member.phone,
    email: member.email,
    gender: member.gender,
    dateOfBirth: member.date_of_birth,
    address: member.address,
    emergencyContactName: member.emergency_contact_name,
    emergencyContactPhone: member.emergency_contact_phone,
    notes: member.notes,
    membershipPlanId: member.membership_plan_id,
    joinDate: member.join_date,
    membershipStartDate: member.membership_start_date,
    membershipEndDate: member.membership_end_date,
  };
}
