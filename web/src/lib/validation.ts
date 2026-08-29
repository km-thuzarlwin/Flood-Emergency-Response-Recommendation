/**
 * Request validation for POST /api/flood-case (doc 5 request body).
 * Categorical fields are strict enums; numbers must be finite integers in range.
 * A bad body is a 422 invalid_request — never a computed severity (doc 8 §18.8).
 */
import { z } from "zod";

export const floodCaseInputSchema = z
  .object({
    township_id: z.string().min(1),
    gauge_reading_cm: z.number().int().min(0),
    upstream_heavy_rain_days: z.number().int().min(0),
    local_rainfall: z.enum(["light", "moderate", "heavy", "very_heavy"]),
    embankment_status: z.enum(["intact", "breached"]),
    terrain: z.enum(["low_lying", "elevated"]),
    road_status: z.enum(["open", "impassable"]),
    vulnerable_present: z.boolean(),
    injured_survivors: z.boolean(),
    affected_population: z.number().int().min(0),
  })
  .strict();

export type FloodCaseInput = z.infer<typeof floodCaseInputSchema>;

/** Flatten Zod issues into a compact, human-readable list. */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.join(".") || "(body)";
      return `${path}: ${i.message}`;
    })
    .join("; ");
}
