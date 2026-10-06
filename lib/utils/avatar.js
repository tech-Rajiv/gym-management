/**
 * Member photo helpers, safe for both server and browser.
 */

/**
 * A Cloudinary image address resized for an avatar: a square crop centred on
 * the face, at twice the display size for sharp screens, in the best format
 * the browser takes. Any other address is returned as it is.
 */
export function avatarImageUrl(url, size = 40) {
  if (!url) return null;
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  const px = Math.round(size * 2);
  return url.replace(marker, `${marker}c_fill,g_face,w_${px},h_${px},q_auto,f_auto/`);
}
