import { runFloodCasePipeline } from "@/lib/pipeline";
import { ApiError, errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST /api/flood-case — submit a report, run the full pipeline, return the recommendation. */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ApiError("invalid_request", "request body is not valid JSON");
    }
    const result = await runFloodCasePipeline(body);
    return json(result, 200);
  } catch (err) {
    return errorResponse(err);
  }
}
