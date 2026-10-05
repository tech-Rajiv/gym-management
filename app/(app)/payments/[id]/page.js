import Link from "next/link";
import { notFound } from "next/navigation";
import Badge from "@/components/ui/Badge";
import PaymentDetailActions from "@/components/payments/PaymentDetailActions";
import { getPaymentById } from "@/lib/db/payments";
import { toId } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatTime, toGymDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import { getMethodLabel } from "@/lib/utils/paymentStatus";
import { RupeeIcon } from "@/components/ui/icons";
import styles from "./payment.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const paymentId = toId(id);
  const payment = paymentId ? await getPaymentById(paymentId) : null;
  return { title: payment ? `Payment #${payment.id}` : "Payment not found" };
}

/** One label / value line of the receipt. */
function Row({ label, children }) {
  return (
    <div className={styles.row}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * One payment, in full - laid out like a receipt: the amount up top, then
 * the payment, the membership it paid for, and who paid. Download receipt
 * (PDF) and Delete sit at the top.
 */
export default async function PaymentPage({ params, searchParams }) {
  await requireAdmin();

  const { id } = await params;
  const { from } = await searchParams;
  const paymentId = toId(id);
  const payment = paymentId ? await getPaymentById(paymentId) : null;
  if (!payment) notFound();

  const created = new Date(payment.created_at);

  // Opened from the member's profile: go back there, not to Payment History.
  const back =
    from === "member"
      ? { href: `/members/${payment.member_id}`, label: `Back to ${payment.member_name}` }
      : { href: "/payments", label: "Back to payments" };

  return (
    <div className={styles.page}>
      <Link href={back.href} className={styles.back}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {back.label}
      </Link>

      <article className={styles.receipt}>
        {/* --- The amount ------------------------------------------------- */}
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <span className={styles.icon} aria-hidden="true">
              <RupeeIcon size={22} />
            </span>
            <PaymentDetailActions payment={payment} afterDelete={back.href} />
          </div>
          <p className={styles.label}>Payment received · Receipt #{payment.id}</p>
          {/* The page's heading: what this payment was. */}
          <h1 className={styles.amount}>{formatCurrency(payment.amount)}</h1>
          <p className={styles.sub}>
            from{" "}
            <Link href={`/members/${payment.member_id}`} className={styles.memberLink}>
              {payment.member_name}
            </Link>{" "}
            on {formatDate(payment.paid_on)}
          </p>
        </header>

        {/* --- Payment ---------------------------------------------------- */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Payment</h2>
          <dl className={styles.rows}>
            <Row label="Amount">{formatCurrency(payment.amount)}</Row>
            <Row label="Paid on">{formatDate(payment.paid_on)}</Row>
            <Row label="Method">
              <Badge variant={payment.method === "upi" ? "primary" : "neutral"} dot={false}>
                {getMethodLabel(payment.method)}
              </Badge>
            </Row>
            {payment.method === "upi" && (
              <Row label="UTR / reference">{payment.reference ?? "—"}</Row>
            )}
            <Row label="Remark">{payment.remark || "—"}</Row>
          </dl>
        </section>

        {/* --- What it paid for ------------------------------------------ */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Membership</h2>
          {payment.plan_name ? (
            <dl className={styles.rows}>
              <Row label="Plan">{payment.plan_name}</Row>
              <Row label="Covers">
                {formatDate(payment.membership_start_date)} → {formatDate(payment.membership_end_date)}
              </Row>
              <Row label="Plan price">{formatCurrency(payment.membership_price)}</Row>
            </dl>
          ) : (
            <p className={styles.empty}>Not linked to a membership.</p>
          )}
        </section>

        {/* --- Who paid ---------------------------------------------------- */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Member</h2>
          <dl className={styles.rows}>
            <Row label="Name">
              <Link href={`/members/${payment.member_id}`} className={styles.memberLink}>
                {payment.member_name}
              </Link>
            </Row>
            <Row label="Phone">{payment.member_phone}</Row>
          </dl>
        </section>

        <footer className={styles.footer}>
          Recorded on {formatDate(toGymDate(created))} at {formatTime(created)}
        </footer>
      </article>
    </div>
  );
}
