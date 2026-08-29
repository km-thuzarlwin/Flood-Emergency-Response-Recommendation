import { sql } from "@/lib/db";
import { prologHealthy } from "@/lib/prolog";

/**
 * Liveness of the two external dependencies FERRS needs (doc 2 architecture):
 * PostgreSQL and the Prolog reasoning service. Returns 503 if either is down —
 * matching the fail-safe posture the pipeline itself uses (NFR-1).
 */
export async function GET() {
  const checks: Record<string, "ok" | "unreachable"> = {
    database: "unreachable",
    prolog: "unreachable",
  };

  try {
    await sql`select 1`;
    checks.database = "ok";
  } catch {
    /* leave as unreachable */
  }

  if (await prologHealthy()) {
    checks.prolog = "ok";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");
  return Response.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
