import { listGauges } from "@/lib/repo";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/gauges — GaugeStation records + danger levels. */
export async function GET() {
  try {
    return json({ gauges: await listGauges() });
  } catch (err) {
    return errorResponse(err);
  }
}
