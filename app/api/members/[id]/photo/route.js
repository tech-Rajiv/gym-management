import { ok, fail, notFound, withAdmin } from "@/lib/api";
import { setMemberPhoto } from "@/lib/db/members";
import { toId } from "@/lib/db";
import { uploadMemberPhoto, deleteMemberPhoto } from "@/lib/cloudinary";

/** The browser resizes photos first; this is only a guard. */
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

/**
 * POST /api/members/:id/photo   multipart form with a "photo" file
 *
 * Uploads the member's photo to Cloudinary and saves it. A photo it replaces
 * is deleted from Cloudinary afterwards.
 */
export const POST = withAdmin(async (request, { params }, admin) => {
  const { id } = await params;
  const memberId = toId(id);
  if (!memberId) return notFound("That member could not be found.");

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!file || typeof file === "string") return fail({ message: "Choose a photo to upload." });
  if (file.type && !TYPES.includes(file.type)) {
    return fail({ message: "That file is not a photo. Use a JPG, PNG or WebP image." });
  }
  if (file.size > MAX_BYTES) return fail({ message: "That photo is too large. Use one under 5 MB." });

  const photo = await uploadMemberPhoto(file, memberId);
  const result = await setMemberPhoto(memberId, photo, admin);
  if (!result.found) {
    await deleteMemberPhoto(photo.publicId);
    return notFound("That member could not be found.");
  }
  await deleteMemberPhoto(result.previousPublicId);
  return ok({ photoUrl: photo.url });
});

/**
 * DELETE /api/members/:id/photo
 *
 * Removes the member's photo; the placeholder face shows again.
 */
export const DELETE = withAdmin(async (_request, { params }, admin) => {
  const { id } = await params;
  const memberId = toId(id);
  if (!memberId) return notFound("That member could not be found.");

  const result = await setMemberPhoto(memberId, null, admin);
  if (!result.found) return notFound("That member could not be found.");
  await deleteMemberPhoto(result.previousPublicId);
  return ok({});
});
