import { notFound, withAdmin } from "@/lib/api";
import { EXPORTS } from "@/lib/pdf/exports";
import { pdfResponse } from "@/lib/pdf/tablePdf";

/**
 * GET /api/export/:list?<the page's filters>
 *
 *   members   ?status=&q=
 *   payments  ?q=&method=&month= or ?from=&to=
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
  const { buffer, filename } = await build(filters);
  return pdfResponse(buffer, filename);
});
