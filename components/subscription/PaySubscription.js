"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import SubscriptionNotice from "@/components/subscription/SubscriptionNotice";
import { apiRequest } from "@/lib/client/api";
import { SAAS_PERIOD_DAYS, SAAS_PRICE_RUPEES } from "@/lib/config";
import { formatCurrency } from "@/lib/utils/format";
import styles from "./PaySubscription.module.css";

function loadRazorpay() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not open the payment window."));
    document.body.appendChild(script);
  });
}

/** Razorpay checkout for one period of gym software cover. */
export default function PaySubscription({ gymName, subscription, coverStarts, coverEnds }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);

  const handlePay = async () => {
    setPending(true);
    setMessage(null);
    try {
      const order = await apiRequest("/api/subscription/order", { method: "POST" });
      if (!order.ok) {
        setMessage(order.message || "Could not start the payment.");
        setPending(false);
        return;
      }

      await loadRazorpay();
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: gymName || "Gym subscription",
        description: `${SAAS_PERIOD_DAYS} days of software cover`,
        order_id: order.orderId,
        handler: async (response) => {
          const verified = await apiRequest("/api/subscription/verify", {
            method: "POST",
            body: response,
          });
          if (!verified.ok) {
            setMessage(verified.message || "The payment could not be confirmed.");
            setPending(false);
            return;
          }
          router.replace("/dashboard");
          router.refresh();
        },
        modal: {
          ondismiss: () => setPending(false),
        },
        theme: { color: "#4f46e5" },
      });
      checkout.on("payment.failed", () => {
        setMessage("The payment did not go through. You can try again.");
        setPending(false);
      });
      checkout.open();
    } catch (error) {
      setMessage(error?.message || "Could not open the payment window.");
      setPending(false);
    }
  };

  return (
    <div className={styles.panel}>
      {message && <Alert>{message}</Alert>}
      <SubscriptionNotice
        mode="pay"
        gymName={gymName}
        subscription={subscription}
        price={formatCurrency(SAAS_PRICE_RUPEES)}
        coverStarts={coverStarts}
        coverEnds={coverEnds}
        actionLabel="Pay subscription"
        onAction={handlePay}
        pending={pending}
      />
    </div>
  );
}
