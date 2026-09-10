import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import MemberActions from "@/components/members/MemberActions";
import { getMemberById } from "@/lib/db/members";
import { getMembershipsByMemberId } from "@/lib/db/memberships";
import { getPaymentsByMemberId } from "@/lib/db/payments";
import PaymentTable from "@/components/payments/PaymentTable";
import { describePayment } from "@/lib/utils/paymentStatus";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { formatDate, calculateAge } from "@/lib/utils/dates";
import { formatCurrency, orDash, titleCase, getInitials } from "@/lib/utils/format";
import Button from "@/components/ui/Button";
import { PhoneIcon, MailIcon, InboxIcon, PlusIcon } from "@/components/ui/icons";
import tableStyles from "@/components/ui/Table.module.css";
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
 * Shows the member, their current membership status, and every term they have
 * held. The history is what the separate `memberships` table buys us: a member
 * who has renewed three times shows three rows here, while the list and
 * dashboard still show only the term that is running now.
 */
export default async function MemberDetailPage({ params }) {
  const { id } = await params;
  const member = await getMemberById(id);

  // notFound() renders app/not-found.js and returns a 404, which is the honest
  // answer for a member id that does not exist.
  if (!member) notFound();

  const [memberships, payments] = await Promise.all([
    getMembershipsByMemberId(member.id),
    getPaymentsByMemberId(member.id),
  ]);

  // What this member still owes on their current term.
  const dues = describePayment(
    member.membership_price,
    member.membership_amount_paid
  );
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

      <div className={styles.layout}>
        <Card>
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
            <Badge variant={membership.variant}>{membership.label}</Badge>

            <div className={styles.contact}>
              <p className={styles.contactRow}>
                <PhoneIcon size={15} />
                {member.phone}
              </p>
              <p className={styles.contactRow}>
                <MailIcon size={15} />
                {orDash(member.email)}
              </p>
            </div>
          </div>
        </Card>

        <div className={styles.stack}>
          <Card title="Current Membership">
            {member.plan_name ? (
              <div className={styles.currentTerm}>
                <div>
                  <Badge variant="primary" dot={false}>
                    {member.plan_name}
                  </Badge>
                  <p className={styles.termHint}>
                    {formatCurrency(dues.amountPaid)} of{" "}
                    {formatCurrency(dues.price)}
                    {dues.amountDue > 0
                      ? ` — ${formatCurrency(dues.amountDue)} due`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className={styles.termDates}>
                    {formatDate(member.membership_start_date)} —{" "}
                    {formatDate(member.membership_end_date)}
                  </p>
                  <p className={styles.termHint}>
                    {membership.daysRemaining >= 0
                      ? `${membership.daysRemaining} day${
                          membership.daysRemaining === 1 ? "" : "s"
                        } remaining`
                      : `Expired ${Math.abs(membership.daysRemaining)} day${
                          Math.abs(membership.daysRemaining) === 1 ? "" : "s"
                        } ago`}
                  </p>
                </div>
                <div className={styles.termBadges}>
                  <Badge variant={membership.variant}>{membership.label}</Badge>
                  <Badge variant={dues.variant}>{dues.label}</Badge>
                </div>
              </div>
            ) : (
              <p className={styles.notes}>This member has no active membership.</p>
            )}
          </Card>

          <Card title="Member Details">
            <dl className={styles.details}>
              <Detail label="Phone">{member.phone}</Detail>
              <Detail label="Email">{orDash(member.email)}</Detail>
              <Detail label="Gender">{titleCase(member.gender)}</Detail>
              <Detail label="Date of Birth">
                {member.date_of_birth ? formatDate(member.date_of_birth) : "—"}
              </Detail>
              <Detail label="Join Date">{formatDate(member.join_date)}</Detail>
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

          <Card
            title="Membership History"
            description={`${memberships.length} ${
              memberships.length === 1 ? "term" : "terms"
            } on record`}
            flush
          >
            {memberships.length === 0 ? (
              <EmptyState
                icon={<InboxIcon size={20} />}
                title="No memberships recorded."
                description="This member has no membership terms yet."
              />
            ) : (
              <div className={tableStyles.wrapper}>
                <table className={tableStyles.table}>
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberships.map((term) => {
                      const termStatus = describeMembership(term.end_date);
                      return (
                        <tr key={term.id}>
                          <td>{term.plan_name}</td>
                          <td
                            data-label="Start Date"
                            className={`${tableStyles.muted} ${tableStyles.numeric}`}
                          >
                            {formatDate(term.start_date)}
                          </td>
                          <td data-label="End Date" className={tableStyles.numeric}>
                            {formatDate(term.end_date)}
                          </td>
                          <td data-label="Price" className={tableStyles.numeric}>
                            {formatCurrency(term.price)}
                          </td>
                          <td data-label="Status">
                            <Badge variant={termStatus.variant}>
                              {termStatus.label}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Payment History"
            description={`${payments.length} ${
              payments.length === 1 ? "payment" : "payments"
            } on record`}
            action={
              <Button
                href={`/payments/new?member=${member.id}`}
                variant="secondary"
                size="small"
              >
                <PlusIcon size={15} />
                Record Payment
              </Button>
            }
            flush
          >
            <PaymentTable
              payments={payments}
              showMember={false}
              addHref={`/payments/new?member=${member.id}`}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
