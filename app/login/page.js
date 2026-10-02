import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentAdmin } from "@/lib/auth";
import Brand from "@/components/ui/Brand";
import styles from "./login.module.css";

export const metadata = { title: "Log in" };

export const dynamic = "force-dynamic";

/**
 * The login page - the only page a signed-out visitor can see.
 *
 * Someone already signed in is sent on to the dashboard. That check is made
 * here against the database rather than in proxy.js, so a stale cookie lands
 * on this form instead of bouncing between two redirects.
 */
export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/dashboard");

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <h1 className={styles.title}>
            <Brand size="lg" tagline="Management" />
          </h1>
          <p className={styles.subtitle}>Sign in to manage your gym</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
