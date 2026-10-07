import "server-only";

import { getCurrentAdmin, getCurrentFounder } from "@/lib/auth";
import { getGymSubscription } from "@/lib/db/gyms";
import { describeSubscription, subscriptionAllowsAccess } from "@/lib/utils/subscription";
import { isUniqueViolation } from "@/lib/db";

/**
 * Helpers shared by the API routes under app/api.
 *
 * Every route answers with JSON in one of two shapes, so the browser has one
 * thing to handle:
 *
 *     { ok: true,  ...data }
 *     { ok: false, message?, errors? }   errors is keyed by form field
 */

export function ok(data = {}, status = 200) {
  return Response.json({ ok: true, ...data }, { status });
}

export function fail({ message = null, errors = {} } = {}, status = 400) {
  return Response.json({ ok: false, message, errors }, { status });
}

export function unauthorized() {
  return fail({ message: "Your session has ended. Please log in again." }, 401);
}

export function notFound(message) {
  return fail({ message }, 404);
}

/** The request body as an object, or null when it is not valid JSON. */
export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

/**
 * Turns a failed member write into something worth showing a gym owner.
 *
 * The unique constraints on phone and email are the two failures a user can
 * actually cause and fix, so they are reported against the field itself.
 * Anything else gets a general message - the real error is already logged on
 * the server by lib/db/index.js.
 */
export function memberWriteError(error) {
  if (isUniqueViolation(error, "phone")) {
    return fail({
      errors: {
        phone:
          "A member with this phone number already exists. If they left the gym, find them under the Left filter and restore them.",
      },
    }, 409);
  }

  if (isUniqueViolation(error, "email")) {
    return fail({ errors: { email: "A member with this email address already exists." } }, 409);
  }

  return fail({ message: error?.message ?? "Something went wrong. Please try again." }, 500);
}

/** A failed plan write: a name already used by another plan on sale is
 *  reported against the name field. */
export function planWriteError(error) {
  if (isUniqueViolation(error)) {
    return fail({ errors: { name: "A plan with this name already exists." } }, 409);
  }
  return fail({ message: error?.message ?? "Something went wrong. Please try again." }, 500);
}

/**
 * Wraps a route handler so it only runs for a signed-in admin, who is passed
 * in as the actor for the audit log. Anything unexpected becomes a 500 with a
 * safe message - the real error is already logged by lib/db/index.js.
 *
 *     export const POST = withAdmin(async (request, context, admin) => { ... })
 */
export function withAdmin(handler) {
  return async (request, context) => {
    try {
      const admin = await getCurrentAdmin();
      if (!admin) return unauthorized();

      const path = new URL(request.url).pathname;
      if (!path.startsWith("/api/subscription")) {
        const subscription = describeSubscription(await getGymSubscription(admin.gymId));
        if (!subscriptionAllowsAccess(subscription)) {
          return fail({ message: "A subscription is needed before this gym can be used." }, 402);
        }
      }

      return await handler(request, context, admin);
    } catch (error) {
      console.error("[api]", error);
      return fail(
        { message: error?.message ?? "Something went wrong. Please try again." },
        500
      );
    }
  };
}

/** Same as withAdmin, for the founder who manages gyms rather than one gym's members. */
export function withFounder(handler) {
  return async (request, context) => {
    try {
      const founder = await getCurrentFounder();
      if (!founder) return unauthorized();

      return await handler(request, context, founder);
    } catch (error) {
      console.error("[api]", error);
      return fail(
        { message: error?.message ?? "Something went wrong. Please try again." },
        500
      );
    }
  };
}
