import { getFloodCase } from "@/lib/repo";
import { ApiError, errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/flood-case/:id — current case state (full row, incl. the explainability fields). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const found = await getFloodCase(id);
    if (!found) throw new ApiError("not_found", `no flood case ${id}`);
    return json(found);
  } catch (err) {
    return errorResponse(err);
  }
}
