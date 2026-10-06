import Card from "@/components/ui/Card";
import { SkeletonRows, skeletonStyles } from "@/components/ui/Skeleton";

/** Shown while the plan and its members load. */
export default function PlanLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading plan...</p>
      <Card flush>
        <SkeletonRows count={5} />
      </Card>
    </div>
  );
}
