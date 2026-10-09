import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import AddGymButton from "@/components/founder/AddGymButton";
import FounderBar from "@/components/founder/FounderBar";
import Badge from "@/components/ui/Badge";
import {
  ArrowRightIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  DumbbellIcon,
  MembersIcon,
  RupeeIcon,
} from "@/components/ui/icons";
import { getSession } from "@/lib/auth";
import { listAllSubscriptionPayments, listGyms } from "@/lib/db/gyms";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency, titleCase } from "@/lib/utils/format";
import { describeSubscription, subscriptionPaymentRangesByGym } from "@/lib/utils/subscription";
import { APP_NAME } from "@/lib/config";
import loginStyles from "../login/login.module.css";
import styles from "./founder.module.css";

export const metadata = { title: "Gyms" };
export const dynamic = "force-dynamic";

function badgeVariant(state) {
  if (state === "paid") return "success";
  if (state === "expired") return "danger";
  return "warning";
}

/** Cover window for the list: only when the gym has a last paid day. */
function coverDates(gym, latest) {
  if (!gym.paid_until) {
    return { starts: "—", ends: "—" };
  }
  return {
    starts: latest ? formatDate(latest.coveredFrom) : "—",
    ends: formatDate(gym.paid_until),
  };
}

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
  const rangesByGym = subscriptionPaymentRangesByGym(payments);
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
        <div className={styles.intro}>
          <p className={styles.eyebrow}>
            <BuildingIcon size={12} />
            Operator
          </p>
          <h1 className={styles.hello}>Hello, {first}</h1>
          <p className={styles.helloNote}>{message}</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statIcon} aria-hidden="true">
              <BuildingIcon size={18} />
            </span>
            <div>
              <span>Gyms</span>
              <strong>{gyms.length}</strong>
            </div>
          </div>
          <div className={`${styles.stat} ${styles.statOk}`}>
            <span className={styles.statIcon} aria-hidden="true">
              <CheckIcon size={18} />
            </span>
            <div>
              <span>Covered now</span>
              <strong>{covered}</strong>
            </div>
          </div>
          <div className={`${styles.stat} ${needing > 0 ? styles.statWarn : ""}`}>
            <span className={styles.statIcon} aria-hidden="true">
              <ClockIcon size={18} />
            </span>
            <div>
              <span>Need payment</span>
              <strong>{needing}</strong>
            </div>
          </div>
          <div className={`${styles.stat} ${styles.statMoney}`}>
            <span className={styles.statIcon} aria-hidden="true">
              <RupeeIcon size={18} />
            </span>
            <div>
              <span>Collected</span>
              <strong>{formatCurrency(collected)}</strong>
            </div>
          </div>
        </div>

        <section className={styles.gymSection}>
          <div className={styles.sectionHead}>
            <div>
              <div className={styles.sectionTitleRow}>
                <span className={styles.sectionIcon} aria-hidden="true">
                  <DumbbellIcon size={16} />
                </span>
                <h2 className={styles.sectionTitle}>All gyms</h2>
              </div>
              <p className={styles.sectionNote}>Cover dates, and what each owner paid.</p>
            </div>
            <AddGymButton />
          </div>

          <div className={styles.tablePanel}>
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
                    const latest = rangesByGym.get(Number(gym.id))?.at(-1);
                    const cover = coverDates(gym, latest);
                    return (
                      <tr key={gym.id}>
                        <td>
                          <div className={styles.gymCell}>
                            <span className={styles.gymMark} aria-hidden="true">
                              <BuildingIcon size={16} />
                            </span>
                            <div className={styles.gymName}>
                              <Link href={`/founder/gyms/${gym.id}`}>{gym.name}</Link>
                              <div>
                                <Link href={`/founder/gyms/${gym.id}`} className={styles.open}>
                                  Payments
                                  <ArrowRightIcon size={14} />
                                </Link>
                              </div>
                            </div>
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
                          <Badge variant={badgeVariant(subscription.state)}>{subscription.label}</Badge>
                        </td>
                        <td>{cover.starts}</td>
                        <td>{cover.ends}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ul className={styles.gymCards}>
            {gyms.map((gym) => {
              const subscription = describeSubscription({
                status: gym.subscription_status,
                paid_until: gym.paid_until,
              });
              const latest = rangesByGym.get(Number(gym.id))?.at(-1);
              const cover = coverDates(gym, latest);
              return (
                <li key={gym.id} className={styles.gymCard}>
                  <div className={styles.gymCardTop}>
                    <div className={styles.gymCardTitle}>
                      <span className={styles.gymMark} aria-hidden="true">
                        <BuildingIcon size={16} />
                      </span>
                      <Link href={`/founder/gyms/${gym.id}`} className={styles.gymName}>
                        {gym.name}
                      </Link>
                    </div>
                    <Badge variant={badgeVariant(subscription.state)}>{subscription.label}</Badge>
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
                      <dt>
                        <MembersIcon size={12} />
                        Members
                      </dt>
                      <dd>{gym.member_count}</dd>
                    </div>
                    <div>
                      <dt>
                        <CalendarIcon size={12} />
                        Starts
                      </dt>
                      <dd>{cover.starts}</dd>
                    </div>
                    <div>
                      <dt>
                        <CalendarIcon size={12} />
                        Ends
                      </dt>
                      <dd>{cover.ends}</dd>
                    </div>
                  </dl>
                  <Link href={`/founder/gyms/${gym.id}`} className={styles.open}>
                    View payments
                    <ArrowRightIcon size={14} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
