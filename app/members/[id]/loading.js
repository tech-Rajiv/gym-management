import Card from "@/components/ui/Card";
import Skeleton, { skeletonStyles } from "@/components/ui/Skeleton";

/**
 * Shown while a member's details load.
 *
 * This exists because a `loading.js` also covers the routes nested beneath it:
 * without one here, opening a member would show the members list skeleton and
 * the words "Loading members...", which describes the wrong page.
 */
export default function MemberLoading() {
  return (
    <div>
      <p className={skeletonStyles.loadingText}>Loading member...</p>
      <div className={skeletonStyles.stack}>
        <Card>
          <Skeleton variant="card" />
        </Card>
        <Card>
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </Card>
      </div>
    </div>
  );
}
