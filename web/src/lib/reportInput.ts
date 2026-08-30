/**
 * The Report form's request body (doc 6 v2 — see Handoffs/10-Decision-Log.md, 2026-08-30)
 * and the mapping from it to the reasoner's `FloodCaseInput`.
 *
 * The form vocabulary is richer than the model: every question has an "Unknown" or
 * "in-between" value. None of them inflate severity or priority — they map to the
 * safe reasoner value and add a line to `assumptions`, which the Results screen
 * shows as "Assumptions made" (NFR-1: never a confident-but-unsupported rating).
 *
 * The doc-4 rules and doc-5 weights are untouched; all mapping happens here.
 */
import { z } from "zod";
import type { FloodCaseInput } from "./validation";

/** Qualitative river level → % of the station danger mark. */
export const RIVER_LEVELS = [
  { key: "well_below", label: "Well below", pct: 0.6 },
  { key: "a_little_below", label: "A little below", pct: 0.85 },
  { key: "at_mark", label: "At the mark", pct: 1.0 },
  { key: "above", label: "Above the mark", pct: 1.08 },
  { key: "well_above", label: "Well above the mark", pct: 1.25 },
] as const;
export type RiverLevel = (typeof RIVER_LEVELS)[number]["key"];

export const PEOPLE_RANGES = [
  { key: "under_100", label: "Fewer than 100", value: 50 },
  { key: "100_500", label: "100 – 500", value: 300 },
  { key: "500_2000", label: "500 – 2,000", value: 1000 },
  { key: "2000_10000", label: "2,000 – 10,000", value: 5000 },
  { key: "over_10000", label: "More than 10,000", value: 20000 },
] as const;
export type PeopleRange = (typeof PEOPLE_RANGES)[number]["key"];

export const UPSTREAM_BUCKETS = [
  { key: "none", label: "None", days: 0 },
  { key: "24h", label: "24 hours", days: 1 },
  { key: "48h", label: "48 hours", days: 2 },
  { key: "72h_plus", label: "72 hours +", days: 3 },
  { key: "unknown", label: "Unknown", days: 0 },
] as const;
export type UpstreamBucket = (typeof UPSTREAM_BUCKETS)[number]["key"];

export const reportFormSchema = z
  .object({
    township_id: z.string().min(1),
    river_level: z
      .enum(["well_below", "a_little_below", "at_mark", "above", "well_above"])
      .nullable()
      .default(null),
    /** exact reading, overrides river_level when present */
    gauge_reading_cm: z.number().int().min(0).nullable().default(null),
    embankment: z.enum(["intact", "at_risk", "breached", "unknown"]),
    rainfall: z.enum(["no_rain", "light", "moderate", "heavy", "very_heavy", "unknown"]),
    upstream_rain: z.enum(["none", "24h", "48h", "72h_plus", "unknown"]),
    landform: z.enum(["riverbank", "low_lying_plain", "island", "farmland", "other"]),
    road: z.enum(["accessible", "limited", "inaccessible", "unknown"]),
    vulnerable_groups: z
      .array(z.enum(["elderly", "children", "disabilities", "pregnant"]))
      .default([]),
    injured: z.enum(["yes", "no", "unknown"]),
    people_affected: z.enum(["under_100", "100_500", "500_2000", "2000_10000", "over_10000"]),
  })
  .strict();

export type ReportFormInput = z.infer<typeof reportFormSchema>;

/** JSON-safe: goes straight into the `flood_case.report_detail` jsonb column. */
export type ReportDetailJson = Record<string, string | number | string[] | null>;

export interface MappedReport {
  input: FloodCaseInput;
  detail: ReportDetailJson;
  assumptions: string[];
}

/**
 * @param dangerLevelCm the incident township's gauge danger level, or null when it
 *        has no river gauge (coastal tier).
 */
export function mapReportToReasoner(
  form: ReportFormInput,
  dangerLevelCm: number | null,
): MappedReport {
  const assumptions: string[] = [];

  // ---- river reading ----
  let gauge_reading_cm = 0;
  if (form.gauge_reading_cm != null) {
    gauge_reading_cm = form.gauge_reading_cm;
  } else if (form.river_level != null && dangerLevelCm != null) {
    const lvl = RIVER_LEVELS.find((l) => l.key === form.river_level)!;
    gauge_reading_cm = Math.round(dangerLevelCm * lvl.pct);
  }

  // ---- embankment: only a confirmed breach forces Severe ----
  let embankment_status: FloodCaseInput["embankment_status"] = "intact";
  if (form.embankment === "breached") {
    embankment_status = "breached";
  } else if (form.embankment === "at_risk") {
    assumptions.push(
      "Embankment reported at risk of failure — treated as intact for the rating; a confirmed breach would raise this to Severe.",
    );
  } else if (form.embankment === "unknown") {
    assumptions.push("Embankment status unknown — treated as intact for the rating; verify on the ground.");
  }

  // ---- local rainfall: only very_heavy affects the rating ----
  let local_rainfall: FloodCaseInput["local_rainfall"];
  if (form.rainfall === "no_rain") {
    local_rainfall = "light";
  } else if (form.rainfall === "unknown") {
    local_rainfall = "light";
    assumptions.push("Local rainfall unknown — treated as light (no effect on the rating).");
  } else {
    local_rainfall = form.rainfall;
  }

  // ---- landform → terrain ----
  const terrain: FloodCaseInput["terrain"] = form.landform === "other" ? "elevated" : "low_lying";
  if (form.landform === "other") {
    assumptions.push('Landform reported as "other" — treated as higher ground (no severity bump).');
  }

  // ---- road access → boat-engine requirement ----
  let road_status: FloodCaseInput["road_status"] = "open";
  if (form.road === "inaccessible") {
    road_status = "impassable";
  } else if (form.road === "limited") {
    assumptions.push("Road access limited — treated as open; a motorized boat is not being required on this basis.");
  } else if (form.road === "unknown") {
    assumptions.push("Road access unknown — treated as open; verify whether a motorized boat is needed.");
  }

  // ---- injuries → medical capability ----
  const injured_survivors = form.injured === "yes";
  if (form.injured === "unknown") {
    assumptions.push(
      "Injuries unknown — no medic or medical-equipped shelter is being reserved; the coordinator should confirm.",
    );
  }

  // ---- upstream rain (priority early-warning only) ----
  const upstream_heavy_rain_days =
    UPSTREAM_BUCKETS.find((b) => b.key === form.upstream_rain)?.days ?? 0;
  if (form.upstream_rain === "unknown") {
    assumptions.push("Upstream rainfall unknown — treated as none (no early-warning bonus applied).");
  }

  // ---- vulnerable groups → boolean ----
  const vulnerable_present = form.vulnerable_groups.length > 0;

  // ---- affected population range → representative figure ----
  const affected_population =
    PEOPLE_RANGES.find((r) => r.key === form.people_affected)?.value ?? 0;

  const input: FloodCaseInput = {
    township_id: form.township_id,
    gauge_reading_cm,
    upstream_heavy_rain_days,
    local_rainfall,
    embankment_status,
    terrain,
    road_status,
    vulnerable_present,
    injured_survivors,
    affected_population,
  };

  const detail: ReportDetailJson = {
    river_level: form.river_level,
    gauge_reading_cm_exact: form.gauge_reading_cm,
    embankment: form.embankment,
    rainfall: form.rainfall,
    upstream_rain: form.upstream_rain,
    landform: form.landform,
    road: form.road,
    vulnerable_groups: form.vulnerable_groups,
    injured: form.injured,
    people_affected: form.people_affected,
  };

  return { input, detail, assumptions };
}
