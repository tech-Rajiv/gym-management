import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import MemberActions from "@/components/members/MemberActions";
import CurrentCoverage from "@/components/members/CurrentCoverage";
import MemberPayments from "@/components/members/MemberPayments";
import MemberPhoto from "@/components/members/MemberPhoto";
import { getMemberById } from "@/lib/db/members";
import { getPaymentsByMemberId } from "@/lib/db/payments";
import { requireAdmin } from "@/lib/auth";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { formatDate, calculateAge } from "@/lib/utils/dates";
import { orDash, titleCase, formatCurrency } from "@/lib/utils/format";
import { PhoneIcon, MailIcon, CalendarIcon, CardIcon, MembersIcon } from "@/components/ui/icons";
import styles from "./member.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const member = await getMemberById(id);
  return { title: member ? member.full_name : "Member not found" };
}

/** One label/value pair in the details list. */
function Detail({ label, children, full = false }) {
  return (
    <div className={`${styles.detail} ${full ? styles.full : ""}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Member detail.
 *
 *   1. who they are - one header with their name, status, contact details,
 *      Add Payment and a "⋯" menu (Edit, Mark as left);
 *   2. their current membership - Start and End, how much is left, paid or not;
 *   3. every payment they have made, each opening its own page, with a PDF;
 *   4. their other details.
 */
export default async function MemberDetailPage({ params }) {
  await requireAdmin();

  const { id } = await params;
  const member = await getMemberById(id);

  // notFound() renders app/not-found.js, the honest answer for an unknown id.
  if (!member) notFound();

  const payments = await getPaymentsByMemberId(member.id);
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

  const isLeft = member.member_status === "left";
  const membership = describeMembership(member.membership_end_date);
  const age = calculateAge(member.date_of_birth);
  const about = [
    titleCase(member.gender),
    age ? `${age} years` : null,
    `Member since ${formatDate(member.join_date)}`,
  ].filter((part) => part && part !== "—");

  return (
    <div>
      <Link href="/members" className={styles.back}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to members
      </Link>

      {isLeft && (
        <div className={styles.leftBanner} role="status">
          <strong>Left the gym{member.left_on ? ` on ${formatDate(member.left_on)}` : ""}.</strong>{" "}
          Their record and history are kept. Use Restore in the ⋯ menu if they come back.
        </div>
      )}

      {/* --- Who they are ------------------------------------------------- */}
      <section className={styles.header} aria-label="Member">
        {/* Their photo - tap to add, change or remove it. */}
        <div className={styles.avatar}>
          <MemberPhoto member={member} size={56} />
        </div>
        <div className={styles.identity}>
          <h1 className={styles.name}>
            {member.full_name}
            {isLeft ? (
              <Badge variant="neutral">Left</Badge>
            ) : (
              <Badge variant={membership.variant}>{membership.label}</Badge>
            )}
          </h1>
          <p className={styles.about}>{about.join(" · ")}</p>
        </div>
        <MemberActions member={member} />
        <div className={styles.contact}>
          <a href={`tel:${member.phone.replace(/\s/g, "")}`} className={styles.contactItem}>
            <PhoneIcon size={15} />
            {member.phone}
          </a>
          {member.email && (
            <a href={`mailto:${member.email}`} className={styles.contactItem}>
              <MailIcon size={15} />
              {member.email}
            </a>
          )}
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.stack}>
          <Card title="Current Membership" icon={CalendarIcon} className={styles.coverageCard}>
            <CurrentCoverage member={member} />
          </Card>

          <Card title="Member Details" icon={MembersIcon} className={styles.detailsCard}>
            <dl className={styles.details}>
              <Detail label="Join Date">{formatDate(member.join_date)}</Detail>
              <Detail label="Date of Birth">
                {member.date_of_birth ? formatDate(member.date_of_birth) : "—"}
              </Detail>
              <Detail label="Address" full>
                {orDash(member.address)}
              </Detail>
              {member.notes && (
                <Detail label="Notes" full>
                  <span className={styles.notes}>{member.notes}</span>
                </Detail>
              )}
            </dl>
          </Card>
        </div>

        <div className={styles.stack}>
          <Card
            title="Payment History"
            description={`${payments.length} ${payments.length === 1 ? "payment" : "payments"} · ${formatCurrency(
              totalPaid
            )} paid in total`}
            icon={CardIcon}
            flush
            className={styles.historyCard}
            action={
              payments.length > 0 ? (
                <DownloadPdfButton
                  list="member-payments"
                  params={{ member: member.id }}
                  title={`${member.full_name} - payment history`}
                  description="will be saved as a PDF - every payment this member has made, with all its details."
                  iconOnly
                />
              ) : null
            }
          >
            <MemberPayments payments={payments} />
          </Card>
        </div>
      </div>
    </div>
  );
}
