import { listFloodCases } from "@/lib/repo";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const OVERVIEW_STATUSES = ["open", "assessed", "dispatched"];

/**
 * GET /api/cases — backs the regional overview (doc 6 §13.3).
 * Default: open/assessed/dispatched, ranked by priority then reported_at.
 * `?status=all` returns every case; `?status=a,b` filters.
 */
export async function GET(request: Request) {
  try {
    const raw = new URL(request.url).searchParams.get("status");
    let statuses: string[] | undefined = OVERVIEW_STATUSES;
    if (raw === "all") statuses = undefined;
    else if (raw) statuses = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return json({ cases: await listFloodCases(statuses) });
  } catch (err) {
    return errorResponse(err);
  }
}
