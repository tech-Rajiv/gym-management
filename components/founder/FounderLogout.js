"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client/api";
import styles from "./FounderLogout.module.css";

/** Ends the founder session and returns to the founder login. */
export default function FounderLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    await apiRequest("/api/auth/logout", { method: "POST" });
    router.replace("/founder");
    router.refresh();
  };

  return (
    <button type="button" className={styles.button} onClick={handleLogout} disabled={pending}>
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
