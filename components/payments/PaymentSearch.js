"use client";

import SearchInput from "@/components/ui/SearchInput";
import FilterTabs from "@/components/ui/FilterTabs";
import styles from "./PaymentSearch.module.css";

/** The methods a payment history can be filtered by. */
const METHOD_FILTERS = [
  { value: "all", label: "All" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
];

/**
 * Search and method filter for the payment history.
 *
 * Both write to the URL and let the server re-query, so filtering by cash and
 * reading the totals above answers "how much cash have I taken?" without a
 * separate report.
 */
export default function PaymentSearch({ method = "all" }) {
  return (
    <div className={styles.controls}>
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
