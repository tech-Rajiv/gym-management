import "server-only";

import { createHash } from "node:crypto";

/**
 * Member photos on Cloudinary.
 *
 * Uploads are signed here, on the server, with CLOUDINARY_API_SECRET - the
 * secret never reaches the browser, so nobody can upload to the account from
 * outside the app. The browser sends the (already resized) photo to our own
 * API route, which passes it on.
 *
 * Settings, from .env:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 *   PRESET_NAME   optional upload preset applied to every upload
 *
 * Uses Cloudinary's plain HTTP API, so no SDK is needed.
 */

const FOLDER = "aura-fitness/members";

function settings() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Photo uploads are not set up. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env."
    );
  }
  return { cloudName, apiKey, apiSecret, preset: process.env.PRESET_NAME || null };
}

/**
 * Cloudinary's request signature: the parameters sorted by name as
 * "a=1&b=2", followed by the API secret, hashed with SHA-1.
 */
function sign(params, apiSecret) {
  const text = Object.keys(params)
    .filter((key) => params[key] !== null && params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(text + apiSecret).digest("hex");
}

async function call(path, fields) {
  const { cloudName } = settings();
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/${path}`, {
    method: "POST",
    body: fields,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "The photo service did not accept the request.");
  }
  return data;
}

/**
 * Uploads a member's photo.
 *
 * @param {Blob} file the image
 * @param {number} memberId used in the file's name, for finding it in Cloudinary
 * @returns {Promise<{url: string, publicId: string}>}
 */
export async function uploadMemberPhoto(file, memberId) {
  const { apiKey, apiSecret, preset } = settings();
  const params = {
    folder: FOLDER,
    public_id: `member-${memberId}-${Date.now()}`,
    timestamp: Math.floor(Date.now() / 1000),
    ...(preset ? { upload_preset: preset } : {}),
  };

  const fields = new FormData();
  fields.append("file", file);
  for (const [key, value] of Object.entries(params)) fields.append(key, String(value));
  fields.append("api_key", apiKey);
  fields.append("signature", sign(params, apiSecret));

  const data = await call("upload", fields);
  return { url: data.secure_url, publicId: data.public_id };
}

/**
 * Deletes a photo from Cloudinary. Best effort: a photo that is already gone
 * is not an error, and a failure here never undoes the change in the app.
 */
export async function deleteMemberPhoto(publicId) {
  if (!publicId) return;
  try {
    const { apiKey, apiSecret } = settings();
    const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000) };
    const fields = new FormData();
    for (const [key, value] of Object.entries(params)) fields.append(key, String(value));
    fields.append("api_key", apiKey);
    fields.append("signature", sign(params, apiSecret));
    await call("destroy", fields);
  } catch (error) {
    console.error("[cloudinary] could not delete", publicId, error?.message);
  }
}
