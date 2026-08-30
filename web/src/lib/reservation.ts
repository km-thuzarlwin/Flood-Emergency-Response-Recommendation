/**
 * Resource assignment + atomic reservation + case persistence (doc 2 §11, doc 5
 * "Case Lifecycle & Resource Reservation", NFR-3).
 *
 * Everything that reads or writes mutable resource state happens inside ONE
 * transaction: a transaction-scoped advisory lock serialises case creation (so
 * `FLD-YYYYMMDD-NNN` sequencing is race-free), the candidate rows are read fresh,
 * selection runs, the chosen rows are `SELECT ... FOR UPDATE` re-verified, then
 * flipped to reserved, then the case row is inserted — all or nothing.
 */
import { sql } from "./db";
import { selectUnit, selectShelter, type IncidentContext, type UnitRow, type ShelterRow, type Selection } from "./domain/filtering";
import type { PriorityResult } from "./domain/priority";
import type { PrologAssessment } from "./prolog";
import type { FloodCaseInput } from "./validation";
import type { ReportDetailJson } from "./reportInput";

/** One global key — case creation is low-QPS (a township coordinator tool). */
const CASE_CREATION_LOCK = 4815162342;

export interface AssignmentArgs {
  input: FloodCaseInput;
  incident: IncidentContext;
  assessment: PrologAssessment;
  priority: PriorityResult;
  gaugePercent: number | null;
  reportDetail: ReportDetailJson;
  assumptions: string[];
}

export interface AssignmentResult {
  caseId: string;
  unit: Selection & { homeTownshipId: string | null };
  shelter: Selection & { displayName: string | null };
}

export async function assignAndReserve(args: AssignmentArgs): Promise<AssignmentResult> {
  const { input, incident, assessment, priority, gaugePercent, reportDetail, assumptions } = args;

  return sql.begin(async (tx): Promise<AssignmentResult> => {
    await tx`select pg_advisory_xact_lock(${CASE_CREATION_LOCK})`;

    const units = await tx<UnitRow[]>`
      select id, home_township_id, status, mobility, medical_support from rescue_unit
    `;
    const shelters = await tx<ShelterRow[]>`
      select id, display_name, township_id, status, capability from shelter
    `;

    const unitSel = selectUnit(units, assessment.required_capabilities, incident);
    const shelterSel = selectShelter(shelters, assessment.required_shelter_capabilities, incident);

    if (unitSel.id) {
      const [u] = await tx<{ status: string }[]>`
        select status from rescue_unit where id = ${unitSel.id} for update
      `;
      if (!u || u.status !== "available") {
        throw new Error(`invariant: selected unit ${unitSel.id} not available under lock`);
      }
      await tx`update rescue_unit set status = 'reserved' where id = ${unitSel.id}`;
    }

    if (shelterSel.id) {
      const [s] = await tx<{ status: string }[]>`
        select status from shelter where id = ${shelterSel.id} for update
      `;
      if (!s || s.status !== "accepting") {
        throw new Error(`invariant: selected shelter ${shelterSel.id} not accepting under lock`);
      }
      await tx`update shelter set status = 'reserved_full' where id = ${shelterSel.id}`;
    }

    // FLD-YYYYMMDD-NNN, server (UTC) date
    const now = new Date();
    const ymd =
      `${now.getUTCFullYear()}` +
      `${String(now.getUTCMonth() + 1).padStart(2, "0")}` +
      `${String(now.getUTCDate()).padStart(2, "0")}`;
    const prefix = `FLD-${ymd}-`;
    const [last] = await tx<{ case_id: string }[]>`
      select case_id from flood_case
      where case_id like ${prefix + "%"}
      order by case_id desc limit 1
    `;
    const seq = last ? Number(last.case_id.slice(prefix.length)) + 1 : 1;
    const caseId = `${prefix}${String(seq).padStart(3, "0")}`;

    const notes = [...unitSel.notes, ...shelterSel.notes];

    await tx`
      insert into flood_case (
        case_id, township_id, gauge_reading_cm, upstream_heavy_rain_days,
        local_rainfall, embankment_status, terrain, road_status,
        vulnerable_present, injured_survivors, affected_population,
        status, severity, severity_reason, gauge_percent, recommended_action,
        required_capabilities, priority_score, priority_band,
        assigned_unit_id, assigned_shelter_id,
        assigned_unit_distance, assigned_shelter_distance, notes,
        report_detail, assumptions
      ) values (
        ${caseId}, ${input.township_id}, ${input.gauge_reading_cm}, ${input.upstream_heavy_rain_days},
        ${input.local_rainfall}, ${input.embankment_status}, ${input.terrain}, ${input.road_status},
        ${input.vulnerable_present}, ${input.injured_survivors}, ${input.affected_population},
        'assessed', ${assessment.severity}, ${assessment.severity_reason}, ${gaugePercent}, ${assessment.recommended_action},
        ${assessment.required_capabilities}::capability[], ${priority.score}, ${priority.band},
        ${unitSel.id}, ${shelterSel.id},
        ${unitSel.distanceToIncident}, ${shelterSel.distanceToIncident}, ${notes}::text[],
        ${tx.json(reportDetail)}, ${assumptions}::text[]
      )
    `;

    const chosenUnit = unitSel.id ? units.find((u) => u.id === unitSel.id) : undefined;
    const chosenShelter = shelterSel.id ? shelters.find((s) => s.id === shelterSel.id) : undefined;

    return {
      caseId,
      unit: { ...unitSel, homeTownshipId: chosenUnit?.home_township_id ?? null },
      shelter: { ...shelterSel, displayName: chosenShelter?.display_name ?? null },
    };
  });
}
