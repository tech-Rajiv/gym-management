"use client";

import SearchInput from "@/components/ui/SearchInput";
import FilterTabs from "@/components/ui/FilterTabs";
import PaymentPeriodFilter from "./PaymentPeriodFilter";
import styles from "./PaymentSearch.module.css";

/** The methods a payment history can be filtered by. */
const METHOD_FILTERS = [
  { value: "all", label: "All" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
];

/**
 * Search, method filter and date filter for the payment history.
 *
 * All three write to the URL and let the server re-query, so a filtered view
 * can be bookmarked or shared.
 */
export default function PaymentSearch({ method = "all", period, months }) {
  return (
    <div className={styles.controls}>
      <PaymentPeriodFilter months={months} period={period} />
      <SearchInput
        placeholder="Search payments..."
        label="Search payments by member, phone, reference or remark"
      />
      <FilterTabs
        param="method"
        active={method}
        defaultValue="all"
        label="Filter payments by method"
        options={METHOD_FILTERS}
      />
    </div>
  );
}
