import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import CreateGymForm from "@/components/founder/CreateGymForm";
import FounderLogout from "@/components/founder/FounderLogout";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { DumbbellIcon } from "@/components/ui/icons";
import { getSession } from "@/lib/auth";
import { listGyms } from "@/lib/db/gyms";
import { formatDate } from "@/lib/utils/dates";
import { describeSubscription } from "@/lib/utils/subscription";
import { APP_NAME } from "@/lib/config";
import loginStyles from "../login/login.module.css";
import styles from "./founder.module.css";

export const metadata = { title: "Gyms" };
export const dynamic = "force-dynamic";

/**
 * Founder home.
 *
 * Signed out: the founder login. Signed in as a gym owner: sent to that gym.
 * Signed in as the founder: every gym, its member count, and whether it has
 * paid for the software, plus the form that creates the next gym.
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

  const gyms = await listGyms();

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.top}>
          <div>
            <p className={styles.eyebrow}>Founder</p>
            <h1 className={styles.title}>Gyms</h1>
            <p className={styles.subtitle}>
              Each gym only sees its own members. Subscription is recorded here and is separate from member fees.
            </p>
          </div>
          <FounderLogout />
        </header>

        <Card title="All gyms" description={`${gyms.length} ${gyms.length === 1 ? "gym" : "gyms"}`} flush>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Gym</th>
                  <th>Owner</th>
                  <th>Members</th>
                  <th>Subscription</th>
                  <th>Last paid day</th>
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
                  return (
                    <tr key={gym.id}>
                      <td className={styles.gymName}>{gym.name}</td>
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
                      <td>{gym.paid_until ? formatDate(gym.paid_until) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Add a gym" description="The owner uses this email and password on the gym login page.">
          <CreateGymForm />
        </Card>
      </div>
    </main>
  );
}
