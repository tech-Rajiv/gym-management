"use client";

import SearchInput from "@/components/ui/SearchInput";
import PeriodFilter from "@/components/ui/PeriodFilter";
import styles from "./PaymentSearch.module.css";

/**
 * The payment history's filters: the period (All time, This month, Last month
 * or a custom range) and a search.
 *
 * Both write to the URL and let the server re-query, so a filtered view can
 * be bookmarked or shared.
 */
export default function PaymentSearch({ period, periodOptions }) {
  return (
    <div className={styles.controls}>
      <PeriodFilter id="payment-period" options={periodOptions} period={period} />
      <SearchInput
        placeholder="Search payments..."
        label="Search payments by member, phone, reference or remark"
      />
    </div>
  );
}
