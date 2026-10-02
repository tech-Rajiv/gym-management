import { Suspense } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import PaymentTable from "@/components/payments/PaymentTable";
import PaymentSearch from "@/components/payments/PaymentSearch";
import { getPayments } from "@/lib/db/payments";
import { PlusIcon } from "@/components/ui/icons";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import { requireAdmin } from "@/lib/auth";
import { resolvePaymentPeriod, recentMonths } from "@/lib/utils/paymentPeriod";
import { today } from "@/lib/utils/dates";
import styles from "./payments.module.css";

export const metadata = { title: "Payment History" };

/** Payments change as soon as one is recorded, so never serve a cached copy. */
export const dynamic = "force-dynamic";

/**
 * Payment History.
 *
 * Every payment, newest first, with search, a Cash / UPI filter and a date
 * filter (one month, or a custom range). Like the members list, all of them
 * live in the URL, so PostgreSQL does the filtering and a filtered view can be
 * bookmarked.
 */
export default async function PaymentsPage({ searchParams }) {
  await requireAdmin();
  const { q: search = "", method, month, from, to } = await searchParams;
  const period = resolvePaymentPeriod({ month, from, to });

  const payments = await getPayments({ search, method, from: period.from, to: period.to });
  const isFiltered = Boolean(search) || period.mode !== "all" || (method && method !== "all");

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

      {/* --- Filters: period, search and method, in their own card -------- */}
      <section className={styles.filters} aria-label="Filter payments">
        {/* useSearchParams needs a Suspense boundary around it. */}
        <Suspense fallback={null}>
          <PaymentSearch
            method={method ?? "all"}
            period={period}
            months={recentMonths(today())}
          />
        </Suspense>
      </section>

      {/* --- The list: its count and PDF button, then the payments --------- */}
      <Card flush tone="success">
        <div className={styles.summary}>
          <p className={styles.summaryText}>
            {payments.length} {payments.length === 1 ? "payment" : "payments"}
            <span className={styles.summaryPeriod}>{period.label}</span>
          </p>
          {/* The payments as shown - period, method and search - as a PDF. */}
          <DownloadPdfButton
            list="payments"
            params={{ q: search, method, month, from, to }}
            title={`Payment History - ${period.label}`}
          />
        </div>

        <PaymentTable payments={payments} isSearching={isFiltered} />
      </Card>
    </div>
  );
}
