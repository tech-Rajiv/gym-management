import Link from "next/link";
import { PhoneIcon, WhatsAppIcon, CardIcon } from "@/components/ui/icons";
import { getInitials, telHref, whatsAppHref } from "@/lib/utils/format";
import styles from "./MemberCard.module.css";

/**
 * One member as a sleek card - how member lists look on a phone, where a
 * table has no room.
 *
 *   [avatar]  Name (bold)                         [status pill]
 *             Plan · expiry                       [status detail]
 *             Phone · joined
 *   [Call] [WhatsApp] [Renew]                     [extra actions]
 *
 * Presentational only, so the members list (a Client Component) and the
 * dashboard lists (Server Components) can both render it.
 *
 * @param {object}   member     needs id, first_name/last_name or full_name, phone
 * @param {string[]} lines      the muted lines under the name
 * @param {node}     status     the status pill
 * @param {node}     [statusDetail] small text under the pill
 * @param {boolean}  [renew]    show the Renew (record payment) action
 * @param {node}     [extra]    more action buttons, right-aligned
 * @param {boolean}  [faded]    a member who has left the gym
 */
export default function MemberCard({
  member,
  lines = [],
  status,
  statusDetail,
  renew = false,
  extra,
  faded = false,
}) {
  const [first = "", last = ""] = (member.full_name ?? "").split(" ");

  return (
    <li className={`${styles.card} ${faded ? styles.faded : ""}`}>
      <div className={styles.top}>
        <Link href={`/members/${member.id}`} className={styles.avatar} aria-hidden="true" tabIndex={-1}>
          {getInitials(member.first_name ?? first, member.last_name ?? last)}
        </Link>

        <Link href={`/members/${member.id}`} className={styles.name}>
          {member.full_name}
        </Link>

        <div className={styles.status}>
          {status}
          {statusDetail && <span className={styles.statusDetail}>{statusDetail}</span>}
        </div>

        {/* Below the name and status, using the card's full width. */}
        <div className={styles.info}>
          {lines.filter(Boolean).map((line, index) => (
            <p key={index} className={styles.line}>
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <a href={telHref(member.phone)} className={styles.quick} aria-label={`Call ${member.full_name}`}>
          <PhoneIcon size={15} />
          Call
        </a>
        <a
          href={whatsAppHref(member.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.quick} ${styles.whatsapp}`}
          aria-label={`WhatsApp ${member.full_name}`}
        >
          <WhatsAppIcon size={15} />
          WhatsApp
        </a>
        {renew && (
          <Link
            href={`/payments/new?member=${member.id}`}
            className={`${styles.quick} ${styles.renew}`}
            aria-label={`Renew ${member.full_name}`}
          >
            <CardIcon size={15} />
            Renew
          </Link>
        )}
        {extra && <span className={styles.extra}>{extra}</span>}
      </div>
    </li>
  );
}

/** The list the cards sit in - shown on phones, hidden from 769px up. */
export function MemberCardList({ children }) {
  return <ul className={styles.list}>{children}</ul>;
}

export { styles as memberCardStyles };
