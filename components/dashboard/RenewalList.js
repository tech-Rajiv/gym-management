import Link from "next/link";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import MemberListItem, { MemberList } from "@/components/members/MemberListItem";
import MemberRowMenu from "@/components/members/MemberRowMenu";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import { InboxIcon, ArrowRightIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import styles from "./RenewalList.module.css";

/**
 * A short dashboard list - Expired, Expiring Soon, New This Month.
 *
 * The dashboard is a glance, not the full list: it shows the first few
 * members (the page fetches only DASHBOARD_LIST_SIZE) and, when there are
 * more, a "See N more" button that opens the Members page already filtered
 * to the same people.
 *
 * Each row is a MemberListItem with the same "⋯" menu as the Members page -
 * View, Edit, Mark as left.
 *
 * @param {object[]} members  the first few rows
 * @param {number}   total    how many there are in all, from the stat counts
 * @param {string}   moreHref the members list filtered to the same people
 * @param {string}   [pdfStatus] the members filter for the header's PDF
 *                   button, which downloads the whole list, not just the few
 * @param {boolean}  [showJoined] say when each member joined, instead of how
 *                   long their membership has left
 * @param {string}   [tone]   the card's colour, matching its stat card
 */
export default function RenewalList({
  title,
  description,
  emptyTitle,
  members,
  total,
  moreHref,
  showJoined = false,
  pdfStatus,
  tone,
  icon,
}) {
  const remaining = total - members.length;

  return (
    <Card
      title={title}
      description={description}
      tone={tone}
      icon={icon}
      action={
        pdfStatus && total > 0 ? (
          <DownloadPdfButton
            list="members"
            params={{ status: pdfStatus }}
            title={`Members - ${title} (all ${total})`}
            iconOnly
          />
        ) : null
      }
      flush
    >
      {members.length === 0 ? (
        <EmptyState icon={<InboxIcon size={20} />} title={emptyTitle} />
      ) : (
        <>
          <MemberList>
            {members.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                note={showJoined ? `Joined ${formatDate(member.join_date)}` : undefined}
                menu={<MemberRowMenu member={member} />}
              />
            ))}
          </MemberList>

          {remaining > 0 && (
            <Link href={moreHref} className={styles.more}>
              See {remaining} more
              <ArrowRightIcon size={15} />
            </Link>
          )}
        </>
      )}
    </Card>
  );
}
