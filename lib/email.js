import "server-only";

/**
 * Sending email, through Resend's HTTP API.
 *
 * One plain fetch - no SDK needed for a single endpoint. RESEND_API_KEY comes
 * from .env and never leaves the server (`server-only` above).
 *
 * The sender must be an address Resend allows: `onboarding@resend.dev` works
 * straight away but only delivers to the email you signed up to Resend with.
 * To send to anyone else, verify your own domain in Resend and set
 * REPORT_EMAIL_FROM, e.g. "Aura Fitness <reports@yourgym.com>".
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Who the daily report goes to, and who it comes from.
 *
 * The report goes to the gym's own address - the one that owns the Resend
 * account - because Resend's free plan only delivers to that address.
 */
export const REPORT_EMAIL_TO =
  process.env.REPORT_EMAIL_TO ?? "support.aurafitness@gmail.com";
export const REPORT_EMAIL_FROM =
  process.env.REPORT_EMAIL_FROM ?? "Aura Fitness <onboarding@resend.dev>";

/**
 * Sends one email.
 *
 * @returns {Promise<{ id: string }>} Resend's id for the email
 * @throws  with a readable message when Resend refuses or cannot be reached
 */
export async function sendEmail({
  to,
  from = REPORT_EMAIL_FROM,
  subject,
  html,
  text,
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set, so no email can be sent.");
  }

  let response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
  } catch (error) {
    console.error("[email] Resend could not be reached:", error);
    throw new Error(
      "The email service could not be reached. Please try again.",
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("[email] Resend refused the email:", response.status, data);
    throw new Error(
      `The email was not sent: ${data?.message ?? `error ${response.status}`}`,
    );
  }
  return { id: data.id };
}
