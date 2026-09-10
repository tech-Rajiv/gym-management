import { Suspense } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import PaymentTable from "@/components/payments/PaymentTable";
import PaymentSearch from "@/components/payments/PaymentSearch";
import { getPayments, getPaymentTotals } from "@/lib/db/payments";
import { formatCurrency } from "@/lib/utils/format";
import { PlusIcon } from "@/components/ui/icons";
import styles from "./payments.module.css";

export const metadata = { title: "Payment History" };

/** Payments change as soon as one is recorded, so never serve a cached copy. */
export const dynamic = "force-dynamic";

/**
 * Payment History.
 *
 * Like the members list, the search term and method filter live in the URL, so
 * PostgreSQL does the filtering and a filtered view can be bookmarked.
 */
export default async function PaymentsPage({ searchParams }) {
  const { q: search = "", method } = await searchParams;

  const [payments, totals] = await Promise.all([
    getPayments({ search, method }),
    getPaymentTotals({ search, method }),
  ]);

  return (
    <div>
      <PageHeader
        title="Payment History"
        description="Every payment received, entered by hand. Aura records payments — it does not process them."
        actions={
          <Button href="/payments/new" variant="primary">
            <PlusIcon size={16} />
            Record Payment
          </Button>
        }
      />

      {/* Totals for whatever is currently being shown, so filtering by cash
          answers "how much cash have I taken?" without a separate report. */}
      <div className={styles.totals}>
        <div className={styles.total}>
          <span className={styles.totalLabel}>Total received</span>
          <span className={styles.totalValue}>{formatCurrency(totals.total)}</span>
        </div>
        <div className={styles.total}>
          <span className={styles.totalLabel}>By UPI</span>
          <span className={styles.totalValue}>{formatCurrency(totals.upi_total)}</span>
        </div>
        <div className={styles.total}>
          <span className={styles.totalLabel}>By cash</span>
          <span className={styles.totalValue}>{formatCurrency(totals.cash_total)}</span>
        </div>
        <div className={styles.total}>
          <span className={styles.totalLabel}>Records</span>
          <span className={styles.totalValue}>{totals.count}</span>
        </div>
      </div>

      <Card flush>
        {/* useSearchParams needs a Suspense boundary around it. */}
        <Suspense fallback={null}>
          <div className={styles.toolbar}>
            <PaymentSearch method={method ?? "all"} />
          </div>
        </Suspense>

        <PaymentTable payments={payments} isSearching={Boolean(search)} />
      </Card>
    </div>
  );
}
