/**
 * TypeScript mirror of the FERRS database (supabase/migrations 001–006).
 * Column names are snake_case to match rows returned by postgres.js.
 *
 * The typed columns below hold the *reasoner's* values (what Prolog saw and what
 * `severity` is derived from). The responder's raw v2-form answers live in
 * `flood_case.report_detail`; the "Unknown / mapped" notes live in
 * `flood_case.assumptions`. (Migration 006 also widened the `local_rainfall` /
 * `embankment_status` / `road_status` enums for possible future use; the app
 * currently only writes the classic values here.)
 */

export type HazardTier = "riverine_upper" | "riverine_central" | "coastal_surge" | "hub";
export type LocalRainfall = "light" | "moderate" | "heavy" | "very_heavy";
export type EmbankmentStatus = "intact" | "breached";
export type Terrain = "low_lying" | "elevated";
export type RoadStatus = "open" | "impassable";
export type CaseStatus = "open" | "assessed" | "dispatched" | "resolved" | "cancelled";
export type SeverityLevel = "low" | "moderate" | "high" | "severe";
export type PriorityBand = "low" | "moderate" | "high" | "critical";
export type Capability = "motorized" | "medical_support";
export type UnitStatus = "available" | "reserved" | "deployed";
export type UnitMobility = "motorized" | "standard";
export type ShelterStatus = "accepting" | "full" | "reserved_full";
export type ShelterCapability = "general" | "medical_equipped";

export interface GaugeStation {
  id: string;
  river: string;
  danger_level_cm: number;
  source_note: string;
}

export interface Township {
  id: string;
  display_name: string;
  district: string;
  hazard_tier: HazardTier;
  gauge_station_id: string | null;
  lat: number;
  lng: number;
  is_base: boolean;
}

export interface NetworkEdge {
  id: string; // int8 -> string from postgres.js
  from_township_id: string;
  to_township_id: string;
  distance: string; // numeric -> string; cast to number where used
  passable: boolean;
}

export interface RescueUnit {
  id: string;
  home_township_id: string;
  status: UnitStatus;
  mobility: UnitMobility;
  medical_support: boolean;
  capacity: number | null;
}

export interface Shelter {
  id: string;
  display_name: string;
  township_id: string;
  status: ShelterStatus;
  capability: ShelterCapability;
  capacity: number | null;
}

export interface FloodCase {
  case_id: string;
  township_id: string;
  gauge_reading_cm: number;
  upstream_heavy_rain_days: number;
  local_rainfall: LocalRainfall;
  embankment_status: EmbankmentStatus;
  terrain: Terrain;
  road_status: RoadStatus;
  vulnerable_present: boolean;
  injured_survivors: boolean;
  affected_population: number;
  reported_at: Date;
  status: CaseStatus;
  severity: SeverityLevel | null;
  severity_reason: string | null;
  gauge_percent: number | null;
  recommended_action: string | null;
  required_capabilities: Capability[] | null;
  priority_score: number | null;
  priority_band: PriorityBand | null;
  assigned_unit_id: string | null;
  assigned_shelter_id: string | null;
  assigned_unit_distance: number | null;
  assigned_shelter_distance: number | null;
  notes: string[];
  /** the responder's raw v2-form answers, before mapping to the reasoner enums */
  report_detail: ReportDetail;
  /** human-readable notes for every Unknown / mapped answer ("Assumptions made") */
  assumptions: string[];
}

export interface ReportDetail {
  river_level: string | null;
  gauge_reading_cm_exact: number | null;
  embankment: "intact" | "at_risk" | "breached" | "unknown";
  rainfall: "no_rain" | "light" | "moderate" | "heavy" | "very_heavy" | "unknown";
  upstream_rain: "none" | "24h" | "48h" | "72h_plus" | "unknown";
  landform: "riverbank" | "low_lying_plain" | "island" | "farmland" | "other";
  road: "accessible" | "limited" | "inaccessible" | "unknown";
  vulnerable_groups: Array<"elderly" | "children" | "disabilities" | "pregnant">;
  injured: "yes" | "no" | "unknown";
  people_affected: "under_100" | "100_500" | "500_2000" | "2000_10000" | "over_10000";
}
