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
import { TagIcon, PlusIcon, CalendarIcon, ArrowRightIcon } from "@/components/ui/icons";
import styles from "./PlansManager.module.css";

/** Price per day, rounded to the rupee - the fairest way to compare plans. */
const perDay = (plan) => Number(plan.price) / plan.duration_days;

/**
 * Which plan is the most chosen (most members) and which is the best value
 * (lowest price per day). Only when there is something to compare, and only
 * for a clear winner - a tie earns no tag.
 */
function highlights(plans) {
  const result = { popular: null, value: null };
  if (plans.length < 2) return result;

  const byMembers = [...plans].sort((a, b) => b.member_count - a.member_count);
  if (byMembers[0].member_count > 0 && byMembers[0].member_count > byMembers[1].member_count) {
    result.popular = byMembers[0].id;
  }

  const byValue = [...plans].sort((a, b) => perDay(a) - perDay(b));
  if (perDay(byValue[0]) < perDay(byValue[1])) result.value = byValue[0].id;

  return result;
}

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
  const tags = highlights(plans);
  const totalMembers = plans.reduce((sum, plan) => sum + plan.member_count, 0);

  return (
    <div>
      <PageHeader
        banner
        icon={<TagIcon size={18} />}
        eyebrow={`${plans.length} ${plans.length === 1 ? "plan" : "plans"} on sale`}
        title="Membership Plans"
        description="What the gym sells, and who is on each plan."
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <PlusIcon size={16} />
            New Plan
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
            <PlanCard
              key={plan.id}
              plan={plan}
              accent={ACCENTS[index % ACCENTS.length]}
              totalMembers={totalMembers}
              popular={tags.popular === plan.id}
              bestValue={tags.value === plan.id}
            />
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
 *   [30 ]  Monthly                               ⋯
 *   [DAYS] ★ Most popular
 *
 *   ₹600 / 30 days
 *   ₹20 per day
 *   (✕ No cardio)
 *   ──────────────────────────────────────────────
 *   Members                            6 · 43%
 *   [██████░░░░░░░░]
 *   (R)(M) Rahul, Meera +4 more                  →
 *
 * The whole card opens the plan's page (a link stretched over it); the "⋯"
 * menu sits above that link, so Edit and Delete do not open the page.
 */
function PlanCard({ plan, accent, totalMembers, popular, bestValue }) {
  const names = (plan.member_names ?? []).filter(Boolean);
  const preview = memberPreview(names, plan.member_count);
  const share = totalMembers > 0 ? Math.round((plan.member_count / totalMembers) * 100) : 0;

  return (
    <article className={`${styles.plan} ${styles[accent]}`}>
      <div className={styles.planTop}>
        {/* The length, like a calendar tile. */}
        <span className={styles.daysTile} aria-hidden="true">
          <strong>{plan.duration_days}</strong>
          <span>days</span>
        </span>
        <div className={styles.heading}>
          <h2 className={styles.planName}>
            <Link href={`/plans/${plan.id}`} className={styles.cover}>
              {plan.name}
            </Link>
          </h2>
          {(popular || bestValue) && (
            <div className={styles.tags}>
              {popular && <span className={`${styles.tag} ${styles.tagPopular}`}>★ Most popular</span>}
              {bestValue && <span className={`${styles.tag} ${styles.tagValue}`}>Best value</span>}
            </div>
          )}
        </div>
        <div className={styles.menu}>
          <PlanMenu plan={plan} />
        </div>
      </div>

      <div className={styles.pricing}>
        <p className={styles.priceLine}>
          <span className={styles.price}>{formatCurrency(plan.price)}</span>
          <span className={styles.per}>/ {plan.duration_days} days</span>
        </p>
        <p className={styles.perDay}>{formatCurrency(Math.round(perDay(plan)))} per day</p>
      </div>

      <div className={styles.features}>
        <CardioBadge included={plan.includes_cardio} />
      </div>

      <div className={styles.footer}>
        <div className={styles.shareLine}>
          <span>Members</span>
          <span className={styles.shareValue}>
            {plan.member_count}
            {totalMembers > 0 && <span className={styles.sharePercent}> · {share}%</span>}
          </span>
        </div>
        <div className={styles.shareTrack} aria-hidden="true">
          <span className={styles.shareFill} style={{ width: `${share}%` }} />
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
              <span className={styles.memberText}>{preview}</span>
            </>
          ) : (
            <span className={styles.memberHint}>No members on this plan yet</span>
          )}
          <ArrowRightIcon size={16} className={styles.arrow} />
        </div>
      </div>
    </article>
  );
}
