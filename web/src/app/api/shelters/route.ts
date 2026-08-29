import { listShelters } from "@/lib/repo";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /api/shelters — shelters with current status. */
export async function GET() {
  try {
    return json({ shelters: await listShelters() });
  } catch (err) {
    return errorResponse(err);
  }
}
