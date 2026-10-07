import { ok, fail, notFound, withAdmin } from "@/lib/api";
import { restoreMember, getMemberById } from "@/lib/db/members";
import { toId } from "@/lib/db";

/**
 * POST /api/members/:id/restore
 *
 * Brings a member who left back onto the active list - for someone who
 * returns to the gym. Their old record and history carry on as before.
 */
export const POST = withAdmin(async (_request, { params }, admin) => {
  const { id } = await params;
  const memberId = toId(id);
  if (!memberId) return notFound("That member could not be found.");

  const changed = await restoreMember(memberId, admin);
  if (changed) return ok({ id: memberId, status: "active" });

  const member = await getMemberById(memberId, admin.gymId);
  return member
    ? fail({ message: "This member is already active." }, 409)
    : notFound("This member no longer exists.");
});
