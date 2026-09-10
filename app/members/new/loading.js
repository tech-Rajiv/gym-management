import Card from "@/components/ui/Card";
import Skeleton, { skeletonStyles } from "@/components/ui/Skeleton";

/** Shown while the membership plans load for the Add Member form. */
export default function NewMemberLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading form...</p>
      <div className={skeletonStyles.stack}>
        <Card>
          <Skeleton variant="card" />
        </Card>
        <Card>
          <Skeleton variant="card" />
        </Card>
      </div>
    </div>
  );
}
