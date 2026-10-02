import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import MemberActions from "@/components/members/MemberActions";
import CurrentCoverage from "@/components/members/CurrentCoverage";
import TermHistory from "@/components/members/TermHistory";
import { getMemberById } from "@/lib/db/members";
import { getMembershipsByMemberId } from "@/lib/db/memberships";
import { getPaymentsByMemberId } from "@/lib/db/payments";
import { requireAdmin } from "@/lib/auth";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { formatDate, calculateAge } from "@/lib/utils/dates";
import { orDash, titleCase, getInitials } from "@/lib/utils/format";
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
 * Laid out in the order the desk needs it:
 *
 *   1. the current term - covered from when, till when, how much is left,
 *      and whether it is paid;
 *   2. every term they have held, each with the payments made for it, so
 *      "when did he pay, and what did that cover?" is answered in one place;
 *   3. their contact and personal details.
 */
export default async function MemberDetailPage({ params }) {
  await requireAdmin();

  const { id } = await params;
  const member = await getMemberById(id);

  // notFound() renders app/not-found.js and returns a 404, which is the honest
  // answer for a member id that does not exist.
  if (!member) notFound();

  const [terms, payments] = await Promise.all([
    getMembershipsByMemberId(member.id),
    getPaymentsByMemberId(member.id),
  ]);

  const isLeft = member.member_status === "left";
  const membership = describeMembership(member.membership_end_date);
  const age = calculateAge(member.date_of_birth);

  return (
    <div>
      <PageHeader
        title={member.full_name}
        description={`Member since ${formatDate(member.join_date)}`}
        backHref="/members"
        backLabel="Back to members"
        actions={<MemberActions member={member} />}
      />

      {isLeft && (
        <div className={styles.leftBanner} role="status">
          <strong>Left the gym{member.left_on ? ` on ${formatDate(member.left_on)}` : ""}.</strong>{" "}
          Their record and history are kept. Use Restore if they come back.
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.stack}>
          <Card className={styles.profileCard}>
            <div className={styles.profile}>
              <span className={styles.avatar}>
                {getInitials(member.first_name, member.last_name)}
              </span>
              <h2 className={styles.profileName}>{member.full_name}</h2>
              <p className={styles.profileMeta}>
                {[titleCase(member.gender), age ? `${age} years` : null]
                  .filter((part) => part && part !== "—")
                  .join(" · ") || "No details on file"}
              </p>
              {isLeft ? (
                <Badge variant="neutral">Left</Badge>
              ) : (
                <Badge variant={membership.variant}>{membership.label}</Badge>
              )}

              <div className={styles.contact}>
                <a href={`tel:${member.phone.replace(/\s/g, "")}`} className={styles.contactRow}>
                  <PhoneIcon size={15} />
                  {member.phone}
                </a>
                <p className={styles.contactRow}>
                  <MailIcon size={15} />
                  {orDash(member.email)}
                </p>
              </div>
            </div>
          </Card>

          <Card title="Member Details" icon={MembersIcon} className={styles.detailsCard}>
            <dl className={styles.details}>
              <Detail label="Join Date">{formatDate(member.join_date)}</Detail>
              <Detail label="Date of Birth">
                {member.date_of_birth ? formatDate(member.date_of_birth) : "—"}
              </Detail>
              <Detail label="Emergency Contact">
                {orDash(member.emergency_contact_name)}
              </Detail>
              <Detail label="Emergency Phone">
                {orDash(member.emergency_contact_phone)}
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
            title="Current Membership"
            tone="primary"
            icon={CalendarIcon}
            className={styles.coverageCard}
          >
            <CurrentCoverage member={member} />
          </Card>

          <Card
            title="Membership & Payment History"
            description={`${terms.length} ${terms.length === 1 ? "term" : "terms"} · ${
              payments.length
            } ${payments.length === 1 ? "payment" : "payments"}`}
            flush
            tone="success"
            icon={CardIcon}
            className={styles.historyCard}
          >
            <TermHistory
              terms={terms}
              payments={payments}
              currentTermId={member.membership_id}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
