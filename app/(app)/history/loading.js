import Card from "@/components/ui/Card";
import { SkeletonRows, skeletonStyles } from "@/components/ui/Skeleton";

/** Shown while the history query runs. */
export default function HistoryLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading history...</p>
      <Card flush>
        <SkeletonRows count={6} />
      </Card>
    </div>
  );
}
