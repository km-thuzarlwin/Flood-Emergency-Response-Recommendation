import { transitionCase } from "@/lib/lifecycle";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST /api/flood-case/:id/resolve — mark status='resolved', release the unit and shelter. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return json(await transitionCase(id, "resolve"));
  } catch (err) {
    return errorResponse(err);
  }
}
