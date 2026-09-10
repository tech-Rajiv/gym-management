/**
 * Application-wide settings.
 *
 * Anything here is a business rule the gym owner might reasonably want to
 * change. Keeping them in one place means the dashboard card, the status badge
 * and the SQL that powers them can never drift apart.
 */

export const APP_NAME = "Aura Fitness";
export const APP_FULL_NAME = "Aura Fitness Management";

/**
 * How many days before expiry a membership starts showing as "Expiring Soon".
 * This single number drives the badge, the members table and the dashboard's
 * "Expiring This Week" card and list.
 */
export const EXPIRING_SOON_DAYS = Number(process.env.EXPIRING_SOON_DAYS ?? 7);

/**
 * The gym's local timezone.
 *
 * The database server runs on UTC. If we asked Postgres for `current_date`,
 * then between midnight and 5:30am in India it would still report yesterday,
 * and memberships would expire a day late. Instead the application works out
 * "today" in this timezone and passes it into every query.
 */
export const GYM_TIMEZONE = process.env.GYM_TIMEZONE ?? "Asia/Kolkata";

/** Options offered by the gender field, used by the form and the schema check. */
export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];
