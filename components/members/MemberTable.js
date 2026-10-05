import MemberListItem, { MemberList } from "./MemberListItem";
import MemberRowMenu from "./MemberRowMenu";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { MembersIcon, SearchIcon, InboxIcon } from "@/components/ui/icons";
import { MEMBER_FILTERS, DEFAULT_MEMBER_FILTER } from "@/lib/utils/membershipStatus";
import { describePayment, getMethodLabel } from "@/lib/utils/paymentStatus";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";

/** "Last paid ₹4,000 on Sep 09, 2026 · Cash · ₹500 due", or "No payment yet". */
function lastPaymentLine(member) {
  if (!member.last_payment_on) return "No payment yet";
  const { amountDue } = describePayment(member.membership_price, member.membership_amount_paid);
  return [
    `Last paid ${formatCurrency(member.last_payment_amount)} on ${formatDate(member.last_payment_on)}`,
    getMethodLabel(member.last_payment_method),
    amountDue > 0 ? `${formatCurrency(amountDue)} due` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The members list, in the same clean row design as the dashboard's
 * Expired / Expiring Soon lists (MemberListItem). The row carries Renew, Call
 * and WhatsApp; View, Edit and Mark as left (or Restore, for someone who has
 * left) are in its "⋯" menu.
 *
 * The data was fetched on the server by the page above.
 *
 * An empty list has three different meanings, and each needs its own advice:
 * nothing matched the search, nothing matched the filter, or there are no
 * members at all. Only the last one is worth offering an Add button for.
 *
 * @param {boolean} isSearching whether a search term is applied
 * @param {string}  filter      the status filter currently applied
 */
export default function MemberTable({
  members,
  isSearching = false,
  filter = DEFAULT_MEMBER_FILTER,
}) {

  if (members.length === 0) {
    if (isSearching) {
      return (
        <EmptyState
          icon={<SearchIcon size={20} />}
          title="No members found."
          description="No members match your search. Try a different name, phone number or email."
        />
      );
    }

    if (filter !== DEFAULT_MEMBER_FILTER) {
      const label = MEMBER_FILTERS.find((option) => option.value === filter)?.label;
      return (
        <EmptyState
          icon={<InboxIcon size={20} />}
          title={`No members in ${label}.`}
          description="Nobody falls into this group right now. Try a different filter."
        />
      );
    }

    return (
      <EmptyState
        icon={<MembersIcon size={20} />}
        title="No members found."
        description="Add your first member to get started."
        action={
          <Button href="/members/new" variant="primary" size="small">
            Add Member
          </Button>
        }
      />
    );
  }

  return (
    <MemberList>
      {members.map((member) => {
        const isLeft = member.member_status === "left";
        return (
          <MemberListItem
            key={member.id}
            member={member}
            faded={isLeft}
            renew={isLeft ? false : undefined}
            status={isLeft ? <Badge variant="neutral">Left</Badge> : undefined}
            note={
              isLeft && member.left_on ? `Left the gym on ${formatDate(member.left_on)}` : undefined
            }
            extra={lastPaymentLine(member)}
            menu={<MemberRowMenu member={member} />}
          />
        );
      })}
    </MemberList>
  );
}
