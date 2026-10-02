import { ok, fail, readJson, withAdmin, memberWriteError } from "@/lib/api";
import { createMember } from "@/lib/db/members";
import { parseMemberForm, validateMember } from "@/lib/validations/member";

/**
 * POST /api/members   the Add Member form's fields
 *
 * Creates a member and their first membership. Responds with the new id so
 * the browser can go where it likes next.
 *
 *     form  ->  API route  ->  validation  ->  repository  ->  PostgreSQL
 */
export const POST = withAdmin(async (request, _context, admin) => {
  const body = await readJson(request);
  if (!body) return fail({ message: "The form could not be read. Please try again." });

  const { valid, errors, values } = validateMember(parseMemberForm(body));
  if (!valid) return fail({ errors });

  try {
    const id = await createMember(values, admin);
    return ok({ id }, 201);
  } catch (error) {
    return memberWriteError(error);
  }
});
