import Card from "@/components/ui/Card";
import Skeleton, { SkeletonRows, skeletonStyles } from "@/components/ui/Skeleton";

/** Placeholder in the dashboard's shape, shown while its three queries run. */
export default function DashboardLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading dashboard...</p>

      <div className={skeletonStyles.stats}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="card" />
        ))}
      </div>

      <Card flush>
        <SkeletonRows count={4} />
      </Card>
    </div>
  );
}
