import { fail, ok, readJson, withFounder } from "@/lib/api";
import { isUniqueViolation } from "@/lib/db";
import { createGym } from "@/lib/db/gyms";

/**
 * POST /api/founder/gyms
 *   { name, ownerName, email, password }
 *
 * Creates a gym and the owner who will sign in to it. The browser never
 * chooses a gym id. The new gym starts unpaid.
 */
export const POST = withFounder(async (request) => {
  const body = await readJson(request);
  if (!body) return fail({ message: "The form could not be read. Please try again." });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const ownerName = typeof body.ownerName === "string" ? body.ownerName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const errors = {};
  if (!name) errors.name = "Gym name is required.";
  if (!ownerName) errors.ownerName = "Owner name is required.";
  if (!email || !email.includes("@")) errors.email = "A valid email is required.";
  if (password.length < 4) errors.password = "Password must be at least 4 characters.";
  if (Object.keys(errors).length > 0) return fail({ errors });

  try {
    const gym = await createGym({ name, ownerName, email, password });
    return ok({ gym }, 201);
  } catch (error) {
    if (isUniqueViolation(error, "email")) {
      return fail({ errors: { email: "An account with this email already exists." } }, 409);
    }
    return fail({ message: error?.message ?? "Could not create the gym." }, 500);
  }
});
