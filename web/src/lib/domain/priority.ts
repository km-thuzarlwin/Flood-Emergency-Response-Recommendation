/**
 * Priority scoring — Handoffs/05-API-and-Backend-Logic.md "Priority Scoring".
 *
 * Runs independently of severity (it is NOT derived from the Prolog result).
 * Every weight and the population tiers are the project's own structure and are
 * flagged in Handoffs/09-Assumptions-and-Provenance.md — do not retune them here.
 */
import type { EmbankmentStatus, LocalRainfall, PriorityBand } from "@/lib/schema";

export interface PriorityInputs {
  embankment_status: EmbankmentStatus;
  /** gauge reading as a % of the station danger level; null when there is no gauge */
  gauge_percent: number | null;
  upstream_heavy_rain_days: number;
  local_rainfall: LocalRainfall;
  road_status: "open" | "impassable";
  vulnerable_present: boolean;
  injured_survivors: boolean;
  affected_population: number;
}

export interface PriorityResult {
  score: number;
  band: PriorityBand;
  breakdown: Record<string, number>;
}

export const MAX_PRIORITY_SCORE = 59;

/** Gauge-band contribution — same band cut-points as doc 4 §7.1 (< 70 scores 0). */
function gaugeBandPoints(gaugePercent: number | null): number {
  if (gaugePercent === null) return 0;
  if (gaugePercent < 70) return 0;
  if (gaugePercent < 100) return 3; // moderate
  if (gaugePercent < 115) return 8; // high
  return 10; // severe
}

const LOCAL_RAINFALL_POINTS: Record<LocalRainfall, number> = {
  light: 0,
  moderate: 3,
  heavy: 5,
  very_heavy: 6,
};

/** Tiered: 0–99 / 100–499 / 500–1,999 / 2,000–9,999 / 10,000+ */
function affectedPopulationPoints(pop: number): number {
  if (pop < 100) return 0;
  if (pop < 500) return 2;
  if (pop < 2_000) return 4;
  if (pop < 10_000) return 6;
  return 8;
}

export function priorityBand(score: number): PriorityBand {
  if (score <= 10) return "low";
  if (score <= 25) return "moderate";
  if (score <= 40) return "high";
  return "critical";
}

export function scorePriority(input: PriorityInputs): PriorityResult {
  const breakdown: Record<string, number> = {
    embankment_breached: input.embankment_status === "breached" ? 12 : 0,
    gauge_band: gaugeBandPoints(input.gauge_percent),
    upstream_heavy_rain: input.upstream_heavy_rain_days >= 3 ? 4 : 0,
    local_rainfall: LOCAL_RAINFALL_POINTS[input.local_rainfall],
    road_impassable: input.road_status === "impassable" ? 6 : 0,
    vulnerable_present: input.vulnerable_present ? 7 : 0,
    injured_survivors: input.injured_survivors ? 6 : 0,
    affected_population: affectedPopulationPoints(input.affected_population),
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  return { score, band: priorityBand(score), breakdown };
}
