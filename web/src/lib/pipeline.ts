/**
 * POST /api/flood-case pipeline — Handoffs/05-API-and-Backend-Logic.md, end to end.
 *
 *   validate → load township + gauge → Prolog assessment  ⟂  priority score
 *            → Dijkstra from the incident → compound filter + route (unit, shelter)
 *            → atomic reserve + persist → response (doc 5 §12.2 / doc 7)
 *
 * Every failure returns an explicit status, never a guessed result (NFR-1).
 */
import { ApiError } from "./http";
import { floodCaseInputSchema, formatIssues } from "./validation";
import { getTownshipWithGauge, listNetworkEdges } from "./repo";
import { buildGraph, dijkstra } from "./domain/routing";
import { scorePriority } from "./domain/priority";
import {
  assessSeverity,
  PrologIncompleteError,
  PrologUnavailableError,
} from "./prolog";
import { assignAndReserve } from "./reservation";
import type { IncidentContext } from "./domain/filtering";
import type { Capability, SeverityLevel, PriorityBand } from "./schema";

export interface FloodCaseResponse {
  case_id: string;
  township_id: string;
  status: "assessed";
  severity: SeverityLevel;
  severity_reason: string;
  recommended_action: string;
  required_capabilities: Capability[];
  priority_score: number;
  priority_band: PriorityBand;
  assigned_unit: { id: string; home_township_id: string | null; distance_to_incident: number } | null;
  assigned_shelter: { id: string; display_name: string | null; distance_to_incident: number } | null;
  notes: string[];
}

export async function runFloodCasePipeline(body: unknown): Promise<FloodCaseResponse> {
  // 1. validate request shape
  const parsed = floodCaseInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError("invalid_request", formatIssues(parsed.error));
  }
  const input = parsed.data;

  // 2. resolve township + its gauge station
  const township = await getTownshipWithGauge(input.township_id);
  if (!township) {
    throw new ApiError("invalid_request", `unknown township_id: ${input.township_id}`);
  }

  const hasGauge = township.danger_level_cm != null;
  if (!hasGauge && input.embankment_status !== "breached") {
    throw new ApiError(
      "incomplete_assessment",
      `${township.display_name} has no river gauge configured — riverine severity cannot be assessed ` +
        `(this township's dominant hazard, storm surge, is not modelled in this build; doc 4 §7.6)`,
    );
  }

  const gaugePercent = hasGauge
    ? Math.round((100 * input.gauge_reading_cm) / township.danger_level_cm!)
    : null;

  // 3a. Prolog assessment (severity / action / required capabilities)
  let assessment;
  try {
    assessment = await assessSeverity({
      township_id: input.township_id,
      ...(hasGauge
        ? { gauge_reading_cm: input.gauge_reading_cm, danger_level_cm: township.danger_level_cm! }
        : {}),
      embankment_status: input.embankment_status,
      terrain: input.terrain,
      local_rainfall: input.local_rainfall,
      road_status: input.road_status,
      injured_survivors: input.injured_survivors,
    });
  } catch (err) {
    if (err instanceof PrologIncompleteError) {
      throw new ApiError("incomplete_assessment", err.message, err.detail);
    }
    if (err instanceof PrologUnavailableError) {
      throw new ApiError("prolog_unavailable", err.message);
    }
    throw err;
  }

  // 3b. priority score — computed independently of severity (doc 5)
  const priority = scorePriority({
    embankment_status: input.embankment_status,
    gauge_percent: gaugePercent,
    upstream_heavy_rain_days: input.upstream_heavy_rain_days,
    local_rainfall: input.local_rainfall,
    road_status: input.road_status,
    vulnerable_present: input.vulnerable_present,
    injured_survivors: input.injured_survivors,
    affected_population: input.affected_population,
  });

  // 4. routing graph from the incident township
  const edges = await listNetworkEdges();
  const distances = dijkstra(buildGraph(edges), input.township_id);
  if (!distances) {
    throw new ApiError(
      "invalid_request",
      `township ${input.township_id} is not present in the routing network`,
    );
  }
  const incident: IncidentContext = {
    townshipId: input.township_id,
    townshipDisplayName: township.display_name,
    distances,
  };

  // 5 + 6. select + atomically reserve + persist
  const { caseId, unit, shelter } = await assignAndReserve({
    input,
    incident,
    assessment,
    priority,
    gaugePercent,
  });

  // 7. response (doc 5 §12.2 shape exactly)
  return {
    case_id: caseId,
    township_id: input.township_id,
    status: "assessed",
    severity: assessment.severity,
    severity_reason: assessment.severity_reason,
    recommended_action: assessment.recommended_action,
    required_capabilities: assessment.required_capabilities,
    priority_score: priority.score,
    priority_band: priority.band,
    assigned_unit:
      unit.id && unit.distanceToIncident !== null
        ? {
            id: unit.id,
            home_township_id: unit.homeTownshipId,
            distance_to_incident: unit.distanceToIncident,
          }
        : null,
    assigned_shelter:
      shelter.id && shelter.distanceToIncident !== null
        ? {
            id: shelter.id,
            display_name: shelter.displayName,
            distance_to_incident: shelter.distanceToIncident,
          }
        : null,
    notes: [...unit.notes, ...shelter.notes],
  };
}
