"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client/api";
import { LogOutIcon } from "@/components/ui/icons";
import styles from "./Header.module.css";

/** Ends the session and goes straight to the login page - nothing else. */
export default function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    await apiRequest("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      className={styles.logout}
      onClick={handleLogout}
      disabled={pending}
    >
      <LogOutIcon size={16} />
      <span className={styles.logoutText}>{pending ? "Logging out…" : "Logout"}</span>
    </button>
  );
}
