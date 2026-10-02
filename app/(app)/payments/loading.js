import Card from "@/components/ui/Card";
import { SkeletonRows, skeletonStyles } from "@/components/ui/Skeleton";

/**
 * Shown while the payment history query runs.
 *
 * A `loading.js` file wraps the page in a Suspense boundary automatically, so
 * the sidebar and header stay on screen and only this area is replaced.
 */
export default function PaymentsLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading payments...</p>
      <Card flush>
        <SkeletonRows count={6} />
      </Card>
    </div>
  );
}
