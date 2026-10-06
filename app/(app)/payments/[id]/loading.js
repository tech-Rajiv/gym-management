import Card from "@/components/ui/Card";
import { SkeletonRows, skeletonStyles } from "@/components/ui/Skeleton";

/** Shown while the payment loads. */
export default function PaymentLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading payment...</p>
      <Card flush>
        <SkeletonRows count={5} />
      </Card>
    </div>
  );
}
