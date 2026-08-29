import { listUnits } from "@/lib/repo";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/units — rescue fleet with current status. */
export async function GET() {
  try {
    return json({ units: await listUnits() });
  } catch (err) {
    return errorResponse(err);
  }
}
