"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import SubscriptionNotice from "@/components/subscription/SubscriptionNotice";
import { apiRequest, formToObject } from "@/lib/client/api";
import styles from "./LoginForm.module.css";

/** Email and password, posted to /api/auth/login. */
export default function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState(null);
  const [needed, setNeeded] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setPending(true);
    setResult(null);

    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      body: formToObject(event.currentTarget),
    });

    if (response.ok) {
      if (response.subscriptionNeeded) {
        setNeeded({
          gymName: response.gymName,
          subscription: response.subscription,
          next: response.next || "/subscription/pay",
        });
        setPending(false);
        return;
      }
      router.replace(response.next || "/dashboard");
      router.refresh();
      return; // Stay "pending" while the next page loads.
    }

    setResult(response);
    setPending(false);
  };

  const continueToPayment = () => {
    router.replace(needed?.next || "/subscription/pay");
    router.refresh();
  };

  return (
    <>
    {needed && (
      <Modal open dismissible={false} label="Subscription needed">
        <SubscriptionNotice
          mode="gate"
          gymName={needed.gymName}
          subscription={needed.subscription}
          actionLabel="Continue to payment"
          onAction={continueToPayment}
        />
      </Modal>
    )}
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {result?.message && <Alert>{result.message}</Alert>}

      <Input
        id="email"
        label="Email"
        type="email"
        autoComplete="username"
        placeholder="you@example.com"
        required
        autoFocus
        error={result?.errors?.email}
      />
      <Input
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        error={result?.errors?.password}
      />

      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
    </>
  );
}
