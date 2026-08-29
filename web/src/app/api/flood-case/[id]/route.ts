import { getCaseView } from "@/lib/caseView";
import { ApiError, errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/flood-case/:id — composed case view for the Results screen:
 * the case row + resolved township / gauge / unit / shelter + map route paths.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const view = await getCaseView(id);
    if (!view) throw new ApiError("not_found", `no flood case ${id}`);
    return json(view);
  } catch (err) {
    return errorResponse(err);
  }
}
