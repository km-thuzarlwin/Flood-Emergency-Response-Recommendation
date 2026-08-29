import { listTownships } from "@/lib/repo";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/townships — network nodes with hazard_tier / gauge_station_id. */
export async function GET() {
  try {
    return json({ townships: await listTownships() });
  } catch (err) {
    return errorResponse(err);
  }
}
