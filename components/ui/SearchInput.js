"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import styles from "./SearchInput.module.css";

/**
 * A search box that filters a server-rendered list.
 *
 * This component does not filter anything. It writes the search term into the
 * URL as `?q=`, the page re-runs on the server, and PostgreSQL does the
 * filtering. That keeps database work on the server and has a useful side
 * effect: a search can be bookmarked, shared or reloaded and still shows the
 * same results.
 *
 * Typing is debounced so a query is not fired on every keystroke, and
 * `useTransition` keeps the input responsive while the server re-renders.
 *
 * Shared by the members list and the payment history - they differ only in
 * their wording, not their behaviour.
 */
export default function SearchInput({ placeholder = "Search...", label }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [term, setTerm] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    if (term === currentQuery) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (term.trim()) {
        params.set("q", term.trim());
      } else {
        params.delete("q");
      }

      startTransition(() => {
        // `scroll: false` keeps the list in place while results narrow down.
        router.replace(`${pathname}?${params}`, { scroll: false });
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [term, pathname, router, searchParams]);

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>
        <SearchIcon size={15} />
      </span>
      <input
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        aria-label={label ?? placeholder}
      />
      {isPending && <span className={styles.spinner} aria-hidden="true" />}
    </div>
  );
}
