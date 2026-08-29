import { transitionCase } from "@/lib/lifecycle";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

/** POST /api/flood-case/:id/dispatch — mark status='dispatched', unit reserved→deployed. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return json(await transitionCase(id, "dispatch"));
  } catch (err) {
    return errorResponse(err);
  }
}
