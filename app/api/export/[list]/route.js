import { notFound, withAdmin } from "@/lib/api";
import { EXPORTS } from "@/lib/pdf/exports";
import { pdfResponse } from "@/lib/pdf/tablePdf";

/**
 * GET /api/export/:list?<the page's filters>
 *
 *   members       ?status=&q=
 *   payments      ?q=&month= or ?from=&to=
 *   plan-members  ?plan=<plan id>
 *   payment       ?id=<payment id>   - one payment's receipt
 *   member-payments ?member=<member id>
 *
 * Downloads the list as a PDF, with the same filters as the page it came
 * from. Signed-in admins only. See lib/pdf/exports.js.
 */
export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request, { params }) => {
  const { list } = await params;
  const build = EXPORTS[list];
  if (!build) return notFound("There is no such list to download.");

  const filters = Object.fromEntries(new URL(request.url).searchParams);
  const result = await build(filters, admin.gymId);
  if (!result) return notFound("That record could not be found.");
  return pdfResponse(result.buffer, result.filename);
});
