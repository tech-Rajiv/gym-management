import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import AddGymButton from "@/components/founder/AddGymButton";
import FounderBar from "@/components/founder/FounderBar";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { DumbbellIcon } from "@/components/ui/icons";
import { getSession } from "@/lib/auth";
import { listAllSubscriptionPayments, listGyms } from "@/lib/db/gyms";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency, titleCase } from "@/lib/utils/format";
import { describeSubscription, subscriptionPaymentRanges } from "@/lib/utils/subscription";
import { APP_NAME } from "@/lib/config";
import loginStyles from "../login/login.module.css";
import styles from "./founder.module.css";

export const metadata = { title: "Gyms" };
export const dynamic = "force-dynamic";

/**
 * Founder home.
 *
 * Signed out: the founder login. Signed in as a gym owner: sent to that gym.
 * Signed in as the founder: every gym, its cover dates, and a button that
 * opens the form for the next gym.
 */
export default async function FounderPage() {
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

  const [gyms, payments] = await Promise.all([listGyms(), listAllSubscriptionPayments()]);
  const rangesByGym = new Map();
  for (const payment of subscriptionPaymentRanges(payments)) {
    const gymId = Number(payment.gym_id);
    const list = rangesByGym.get(gymId) ?? [];
    list.push(payment);
    rangesByGym.set(gymId, list);
  }
  const covered = gyms.filter((gym) => {
    const state = describeSubscription({
      status: gym.subscription_status,
      paid_until: gym.paid_until,
    }).state;
    return state === "paid" || state === "expiring";
  }).length;
  const collected = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const needing = gyms.length - covered;
  const first = titleCase((session.name || "").trim().split(/\s+/)[0] || "there");
  const message =
    needing === 0
      ? "Every gym is covered."
      : needing === 1
        ? "One gym still needs a software payment."
        : `${needing} gyms still need a software payment.`;

  return (
    <main className={styles.page}>
      <FounderBar name={session.name} />
      <div className={styles.inner}>
        <div>
          <h1 className={styles.hello}>Hello, {first}</h1>
          <p className={styles.helloNote}>{message}</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span>Gyms</span>
            <strong>{gyms.length}</strong>
          </div>
          <div className={styles.stat}>
            <span>Covered now</span>
            <strong>{covered}</strong>
          </div>
          <div className={styles.stat}>
            <span>Need payment</span>
            <strong>{gyms.length - covered}</strong>
          </div>
          <div className={styles.stat}>
            <span>Collected</span>
            <strong>{formatCurrency(collected)}</strong>
          </div>
        </div>

        <Card
          className={styles.gymList}
          title="All gyms"
          description="Cover dates, and what each owner paid."
          action={<AddGymButton />}
          flush
        >
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gym</th>
                  <th>Owner</th>
                  <th>Members</th>
                  <th>Subscription</th>
                  <th>Cover starts</th>
                  <th>Cover ends</th>
                </tr>
              </thead>
              <tbody>
                {gyms.map((gym) => {
                  const subscription = describeSubscription({
                    status: gym.subscription_status,
                    paid_until: gym.paid_until,
                  });
                  const variant =
                    subscription.state === "paid"
                      ? "success"
                      : subscription.state === "expired"
                        ? "danger"
                        : "warning";
                  const latest = rangesByGym.get(Number(gym.id))?.at(-1);
                  return (
                    <tr key={gym.id}>
                      <td className={styles.gymName}>
                        <Link href={`/founder/gyms/${gym.id}`}>{gym.name}</Link>
                        <div>
                          <Link href={`/founder/gyms/${gym.id}`} className={styles.open}>
                            Payments
                          </Link>
                        </div>
                      </td>
                      <td>
                        {gym.owner_name ? (
                          <>
                            {gym.owner_name}
                            <div className={styles.muted}>{gym.owner_email}</div>
                          </>
                        ) : (
                          <span className={styles.muted}>No owner yet</span>
                        )}
                      </td>
                      <td className={styles.count}>{gym.member_count}</td>
                      <td>
                        <Badge variant={variant}>{subscription.label}</Badge>
                      </td>
                      <td>{latest ? formatDate(latest.coveredFrom) : "—"}</td>
                      <td>{gym.paid_until ? formatDate(gym.paid_until) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className={styles.gymCards}>
            {gyms.map((gym) => {
              const subscription = describeSubscription({
                status: gym.subscription_status,
                paid_until: gym.paid_until,
              });
              const variant =
                subscription.state === "paid"
                  ? "success"
                  : subscription.state === "expired"
                    ? "danger"
                    : "warning";
              const latest = rangesByGym.get(Number(gym.id))?.at(-1);
              return (
                <li key={gym.id} className={styles.gymCard}>
                  <div className={styles.gymCardTop}>
                    <Link href={`/founder/gyms/${gym.id}`} className={styles.gymName}>
                      {gym.name}
                    </Link>
                    <Badge variant={variant}>{subscription.label}</Badge>
                  </div>
                  <p className={styles.ownerLine}>
                    {gym.owner_name ? (
                      <>
                        {gym.owner_name}
                        <span className={styles.muted}> · {gym.owner_email}</span>
                      </>
                    ) : (
                      <span className={styles.muted}>No owner yet</span>
                    )}
                  </p>
                  <dl className={styles.meta}>
                    <div>
                      <dt>Members</dt>
                      <dd>{gym.member_count}</dd>
                    </div>
                    <div>
                      <dt>Cover starts</dt>
                      <dd>{latest ? formatDate(latest.coveredFrom) : "—"}</dd>
                    </div>
                    <div>
                      <dt>Cover ends</dt>
                      <dd>{gym.paid_until ? formatDate(gym.paid_until) : "—"}</dd>
                    </div>
                  </dl>
                  <Link href={`/founder/gyms/${gym.id}`} className={styles.open}>
                    Payments
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </main>
  );
}
