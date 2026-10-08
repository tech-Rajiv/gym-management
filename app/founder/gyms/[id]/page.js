import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import FounderBar from "@/components/founder/FounderBar";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { DumbbellIcon } from "@/components/ui/icons";
import { getSession } from "@/lib/auth";
import { getFounderGym, listSubscriptionPayments } from "@/lib/db/gyms";
import { APP_NAME } from "@/lib/config";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import { describeSubscription, subscriptionPaymentRanges } from "@/lib/utils/subscription";
import loginStyles from "../../../login/login.module.css";
import styles from "../../founder.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const gym = await getFounderGym(id);
  return { title: gym ? `${gym.name} payments` : "Gym" };
}

function badgeVariant(state) {
  if (state === "paid") return "success";
  if (state === "expired") return "danger";
  return "warning";
}

function daysLabel(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return "—";
  if (daysLeft < 0) return "Ended";
  if (daysLeft === 0) return "Last day";
  if (daysLeft === 1) return "1 day";
  return `${daysLeft} days`;
}

/**
 * One gym's software subscription and every payment the owner has made.
 * Member fees never appear here.
 */
export default async function FounderGymPage({ params }) {
  const session = await getSession();
  if (session?.role === "owner") redirect("/dashboard");

  if (session?.role !== "founder") {
    return (
      <main className={loginStyles.page}>
        <div className={loginStyles.panel}>
          <div className={loginStyles.brand}>
            <span className={loginStyles.logo}>
              <DumbbellIcon size={22} />
            </span>
            <h1 className={loginStyles.title}>{APP_NAME}</h1>
            <p className={loginStyles.subtitle}>Founder sign in</p>
          </div>
          <LoginForm />
          <p className={styles.switchNote}>
            Gym owner? <Link href="/login">Sign in to your gym</Link>
          </p>
        </div>
      </main>
    );
  }

  const { id } = await params;
  const gym = await getFounderGym(id);
  if (!gym) notFound();

  const payments = subscriptionPaymentRanges(await listSubscriptionPayments(gym.id)).reverse();
  const current = payments[0];
  const subscription = describeSubscription({
    status: gym.subscription_status,
    paid_until: gym.paid_until,
  });

  return (
    <main className={styles.page}>
      <FounderBar name={session.name} />
      <div className={styles.inner}>
        <Link href="/founder" className={styles.back}>
          ← All gyms
        </Link>

        <header className={styles.top}>
          <div>
            <div className={styles.headingRow}>
              <h1 className={styles.title}>{gym.name}</h1>
              <Badge variant={badgeVariant(subscription.state)}>{subscription.label}</Badge>
            </div>
            <p className={styles.subtitle}>
              {gym.owner_name
                ? `${gym.owner_name} · ${gym.owner_email} · ${gym.member_count} members`
                : "No owner yet"}
            </p>
          </div>
        </header>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Cover starts</dt>
            <dd>{current ? formatDate(current.coveredFrom) : "—"}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Cover ends</dt>
            <dd>{gym.paid_until ? formatDate(gym.paid_until) : "—"}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Days remaining</dt>
            <dd>{daysLabel(subscription.daysLeft)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Payments</dt>
            <dd>{payments.length}</dd>
          </div>
        </dl>

        <Card
          title="Payment history"
          description="Each row is one software payment. The dates are the days that payment covers."
          flush
        >
          {payments.length === 0 ? (
            <p className={styles.empty}>
              This gym has not paid yet. The owner pays from their gym login, and the payment shows up here.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paid on</th>
                    <th>Amount</th>
                    <th>Cover starts</th>
                    <th>Cover ends</th>
                    <th>Payment id</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.paid_on)}</td>
                      <td className={styles.count}>{formatCurrency(Number(payment.amount))}</td>
                      <td>{formatDate(payment.coveredFrom)}</td>
                      <td>{formatDate(payment.covered_until)}</td>
                      <td className={styles.paymentId}>{payment.razorpay_payment_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {payments.length > 0 && (
            <ul className={styles.payCards}>
              {payments.map((payment) => (
                <li key={payment.id} className={styles.payCard}>
                  <p className={styles.payAmount}>{formatCurrency(Number(payment.amount))}</p>
                  <dl className={styles.meta}>
                    <div>
                      <dt>Paid on</dt>
                      <dd>{formatDate(payment.paid_on)}</dd>
                    </div>
                    <div>
                      <dt>Cover starts</dt>
                      <dd>{formatDate(payment.coveredFrom)}</dd>
                    </div>
                    <div>
                      <dt>Cover ends</dt>
                      <dd>{formatDate(payment.covered_until)}</dd>
                    </div>
                  </dl>
                  <p className={styles.paymentId}>{payment.razorpay_payment_id}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
