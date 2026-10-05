import Link from "next/link";
import { notFound } from "next/navigation";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import CardioBadge from "@/components/plans/CardioBadge";
import PlanMenu from "@/components/plans/PlanMenu";
import { getMembershipPlanById } from "@/lib/db/plans";
import { getMembers } from "@/lib/db/members";
import { toId } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/dates";
import { MembersIcon } from "@/components/ui/icons";
import styles from "./plan.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const planId = toId(id);
  const plan = planId ? await getMembershipPlanById(planId) : null;
  return { title: plan ? plan.name : "Plan not found" };
}

/**
 * One plan: what it is - price, length, cardio, how many are on it - with
 * Edit and Delete in its "⋯" menu, then the members on it as a plain table of
 * name, start and end. A name opens that member's page, where everything
 * else about them is.
 *
 * A plan that has been deleted (taken off sale) still opens, from History or
 * an old link, but read-only.
 */
export default async function PlanPage({ params }) {
  await requireAdmin();

  const { id } = await params;
  const planId = toId(id);
  const plan = planId ? await getMembershipPlanById(planId) : null;
  if (!plan) notFound();

  const members = await getMembers({ planId: plan.id });
  const count = members.length;

  return (
    <div>
      <Link href="/plans" className={styles.back}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to plans
      </Link>

      {/* --- What the plan is ------------------------------------------- */}
      <section className={styles.summary} aria-label="Plan details">
        <div className={styles.titleRow}>
          <div className={styles.titleText}>
            <h1 className={styles.title}>{plan.name}</h1>
            {plan.description && <p className={styles.description}>{plan.description}</p>}
          </div>
          {plan.is_active && <PlanMenu plan={{ ...plan, member_count: count }} />}
        </div>

        {!plan.is_active && (
          <p className={styles.retired} role="status">
            No longer sold. Members already on it keep it until they renew on another plan.
          </p>
        )}

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Price</dt>
            <dd className={styles.price}>{formatCurrency(plan.price)}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Length</dt>
            <dd>{plan.duration_days} days</dd>
          </div>
          <div className={styles.fact}>
            <dt>Cardio</dt>
            <dd>
              <CardioBadge included={plan.includes_cardio} />
            </dd>
          </div>
          <div className={styles.fact}>
            <dt>Members</dt>
            <dd>{count}</dd>
          </div>
        </dl>
      </section>

      {/* --- Who is on it ------------------------------------------------ */}
      <Card flush>
        <div className={styles.listHeader}>
          <p className={styles.count}>
            <strong>
              {count} {count === 1 ? "member" : "members"}
            </strong>
            <span className={styles.countDetail}>on this plan</span>
          </p>
          {count > 0 && (
            <DownloadPdfButton
              list="plan-members"
              params={{ plan: plan.id }}
              title={`${plan.name} - members`}
            />
          )}
        </div>

        {count === 0 ? (
          <EmptyState
            icon={<MembersIcon size={20} />}
            title="No members on this plan yet."
            description="Members appear here once they join or renew on this plan."
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Start</th>
                <th scope="col">End</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <Link href={`/members/${member.id}`} className={styles.name}>
                      {member.full_name}
                    </Link>
                  </td>
                  <td className={styles.date}>{formatDate(member.membership_start_date)}</td>
                  <td className={styles.date}>{formatDate(member.membership_end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
