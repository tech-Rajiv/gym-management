"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import CardioBadge from "./CardioBadge";
import { PlanFormDialog } from "./PlanDialogs";
import PlanMenu from "./PlanMenu";
import { formatCurrency } from "@/lib/utils/format";
import { memberPreview } from "@/lib/utils/plans";
import { PlusIcon, CalendarIcon, ArrowRightIcon } from "@/components/ui/icons";
import styles from "./PlansManager.module.css";

/**
 * Each card's accent, in turn. Neighbouring shades of the brand colour rather
 * than unrelated colours, so the cards are told apart but still read as one set.
 */
const ACCENTS = ["indigo", "violet", "blue", "purple", "sky"];

/**
 * The Plans page: a simple card per plan - name, length, price, whether
 * cardio is included, and who is on it. The card opens the plan's own page
 * with its full member list; Edit and Delete are in the card's "⋯" menu.
 *
 * A Client Component because adding happens in a dialog. The plans were
 * loaded on the server; after a change the page refreshes from the server.
 */
export default function PlansManager({ plans }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <PageHeader
        title="Membership Plans"
        description="What the gym sells. These plans and prices are used when adding members and recording payments."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <PlusIcon size={16} />
            Add Plan
          </Button>
        }
      />

      {plans.length === 0 ? (
        <div className={styles.emptyCard}>
          <EmptyState
            icon={<CalendarIcon size={20} />}
            title="No plans on sale."
            description="Add a plan before adding members or recording payments."
          />
        </div>
      ) : (
        <div className={styles.grid}>
          {plans.map((plan, index) => (
            <PlanCard key={plan.id} plan={plan} accent={ACCENTS[index % ACCENTS.length]} />
          ))}
        </div>
      )}

      {adding && (
        <PlanFormDialog
          onClose={() => setAdding(false)}
          onSaved={(response) => {
            setAdding(false);
            // Straight to the new plan's page; the list behind it is refreshed too.
            if (response?.id) router.push(`/plans/${response.id}`);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/**
 *   Monthly                              ⋯
 *   ₹600  [30 days]
 *   (✓ Cardio included)
 *   ─────────────────────────────────────
 *   (R)(M) Rahul, Meera +4 more          →
 *
 * The whole card opens the plan's page (a link stretched over it); the "⋯"
 * menu sits above that link, so Edit and Delete do not open the page.
 */
function PlanCard({ plan, accent }) {
  const names = (plan.member_names ?? []).filter(Boolean);
  const preview = memberPreview(names, plan.member_count);

  return (
    <article className={`${styles.plan} ${styles[accent]}`}>
      <div className={styles.planTop}>
        <h2 className={styles.planName}>
          <Link href={`/plans/${plan.id}`} className={styles.cover}>
            {plan.name}
          </Link>
        </h2>
        <div className={styles.menu}>
          <PlanMenu plan={plan} />
        </div>
      </div>

      <p className={styles.priceLine}>
        <span className={styles.price}>{formatCurrency(plan.price)}</span>
        <span className={styles.per}>/ {plan.duration_days} days</span>
      </p>
      <div className={styles.features}>
        <CardioBadge included={plan.includes_cardio} />
      </div>

      <div className={styles.members}>
        {preview ? (
          <>
            <span className={styles.avatars} aria-hidden="true">
              {names.map((name, index) => (
                <span key={`${name}-${index}`} className={styles.avatar}>
                  {name.charAt(0).toUpperCase()}
                </span>
              ))}
            </span>
            <span className={styles.memberText}>
              <strong>{preview}</strong>
              <span className={styles.memberHint}>
                {plan.member_count === 1 ? "is on this plan" : "are on this plan"}
              </span>
            </span>
          </>
        ) : (
          <span className={styles.memberText}>
            <span className={styles.memberHint}>No members on this plan yet</span>
          </span>
        )}
        <ArrowRightIcon size={16} className={styles.arrow} />
      </div>
    </article>
  );
}
