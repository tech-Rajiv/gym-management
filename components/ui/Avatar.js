import { avatarImageUrl } from "@/lib/utils/avatar";
import styles from "./Avatar.module.css";

/** The stand-in pictures (public/profile/) for members without a photo. */
const PLACEHOLDERS = {
  female: "/profile/women.png",
  default: "/profile/man.png",
};

/**
 * A member's photo as a circle, or a stand-in picture when they have none -
 * the woman's for members marked female, the man's otherwise. Used wherever
 * a member's name is shown.
 *
 * @param {string} [src]    the photo's address (Cloudinary), if any
 * @param {string} name     for the image's description
 * @param {string} [gender] "male" | "female" | "other" - picks the stand-in
 * @param {number} [size]   in pixels
 */
export default function Avatar({ src, name = "", gender, size = 40, className = "" }) {
  const photo = src ? avatarImageUrl(src, size) : null;
  const image = photo ?? (gender === "female" ? PLACEHOLDERS.female : PLACEHOLDERS.default);

  return (
    <span className={`${styles.avatar} ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- already sized: Cloudinary or an 80px file */}
      <img
        src={image}
        alt={photo && name ? `Photo of ${name}` : ""}
        width={size}
        height={size}
        // Small list avatars load as they scroll into view; a large one (the
        // photo dialog's preview) loads straight away.
        loading={size > 64 ? "eager" : "lazy"}
        decoding="async"
        className={styles.img}
      />
    </span>
  );
}
