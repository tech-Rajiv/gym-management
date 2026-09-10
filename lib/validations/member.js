/**
 * Member form validation.
 *
 * Runs on the server inside the Server Action, because that is the only place
 * it cannot be bypassed. The browser's own `required` attributes are a
 * convenience on top of this, not a replacement for it.
 *
 * `validateMember` both checks and cleans: it returns the normalised values
 * ready for the database, so the repository never has to think about empty
 * strings or stray whitespace.
 */

import { GENDER_OPTIONS } from "@/lib/config";
import { isValidDate, today } from "@/lib/utils/dates";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Deliberately loose: gyms record numbers with spaces, +91 prefixes and dashes.
const PHONE_PATTERN = /^[+]?[\d\s-]{7,20}$/;

const VALID_GENDERS = GENDER_OPTIONS.map((option) => option.value);

/** Trims a value, turning blanks into null so the database stores NULL. */
function clean(value) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Pulls the member fields out of a submitted form.
 * Kept separate from validation so a failed submit can hand the same shape
 * straight back to the form and re-fill it.
 */
export function parseMemberForm(formData) {
  return {
    firstName: clean(formData.get("firstName")),
    lastName: clean(formData.get("lastName")),
    phone: clean(formData.get("phone")),
    email: clean(formData.get("email")),
    gender: clean(formData.get("gender")),
    dateOfBirth: clean(formData.get("dateOfBirth")),
    address: clean(formData.get("address")),
    emergencyContactName: clean(formData.get("emergencyContactName")),
    emergencyContactPhone: clean(formData.get("emergencyContactPhone")),
    notes: clean(formData.get("notes")),
    membershipPlanId: clean(formData.get("membershipPlanId")),
    joinDate: clean(formData.get("joinDate")),
    membershipStartDate: clean(formData.get("membershipStartDate")),
    membershipEndDate: clean(formData.get("membershipEndDate")),
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
