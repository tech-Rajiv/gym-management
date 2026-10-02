import Skeleton, { skeletonStyles } from "@/components/ui/Skeleton";

/** Shown while the plans load. */
export default function PlansLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading plans...</p>
      <div className={skeletonStyles.stats}>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} variant="card" />
        ))}
      </div>
    </div>
  );
}
