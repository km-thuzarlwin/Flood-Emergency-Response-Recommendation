/**
 * Database access for FERRS. Reads use the shared `sql` handle; the transactional
 * writes (reservation, lifecycle transitions) live in reservation.ts / lifecycle.ts
 * so the atomic-transaction boundary (doc 2 §11) is in one obvious place.
 */
import { sql } from "./db";
import type {
  FloodCase,
  GaugeStation,
  RescueUnit,
  Shelter,
  Township,
} from "./schema";
import type { Edge } from "./domain/routing";
import type { UnitRow, ShelterRow } from "./domain/filtering";

export interface TownshipWithGauge extends Township {
  danger_level_cm: number | null;
  gauge_river: string | null;
}

export async function getTownshipWithGauge(id: string): Promise<TownshipWithGauge | null> {
  const rows = await sql<TownshipWithGauge[]>`
    select t.id, t.display_name, t.district, t.hazard_tier, t.gauge_station_id,
           t.lat, t.lng, t.is_base,
           g.danger_level_cm as danger_level_cm,
           g.river          as gauge_river
    from township t
    left join gauge_station g on g.id = t.gauge_station_id
    where t.id = ${id}
  `;
  return rows[0] ?? null;
}

export async function listNetworkEdges(): Promise<Edge[]> {
  return sql<Edge[]>`
    select from_township_id, to_township_id, distance::float8 as distance, passable
    from network_edge
  `;
}

export async function listUnits(): Promise<RescueUnit[]> {
  return sql<RescueUnit[]>`
    select id, home_township_id, status, mobility, medical_support, capacity
    from rescue_unit order by id
  `;
}

export async function listUnitRows(): Promise<UnitRow[]> {
  return sql<UnitRow[]>`
    select id, home_township_id, status, mobility, medical_support
    from rescue_unit
  `;
}

export async function listShelters(): Promise<Shelter[]> {
  return sql<Shelter[]>`
    select id, display_name, township_id, status, capability, capacity
    from shelter order by id
  `;
}

export async function listShelterRows(): Promise<ShelterRow[]> {
  return sql<ShelterRow[]>`
    select id, display_name, township_id, status, capability
    from shelter
  `;
}

export async function listTownships(): Promise<Township[]> {
  return sql<Township[]>`
    select id, display_name, district, hazard_tier, gauge_station_id, lat, lng, is_base
    from township order by id
  `;
}

export async function listGauges(): Promise<GaugeStation[]> {
  return sql<GaugeStation[]>`
    select id, river, danger_level_cm, source_note
    from gauge_station order by id
  `;
}

export async function getFloodCase(caseId: string): Promise<FloodCase | null> {
  const rows = await sql<FloodCase[]>`
    select * from flood_case where case_id = ${caseId}
  `;
  return rows[0] ?? null;
}

export async function listFloodCases(statuses?: string[]): Promise<FloodCase[]> {
  if (statuses && statuses.length > 0) {
    return sql<FloodCase[]>`
      select * from flood_case
      where status in ${sql(statuses)}
      order by priority_score desc nulls last, reported_at asc
    `;
  }
  return sql<FloodCase[]>`
    select * from flood_case
    order by priority_score desc nulls last, reported_at asc
  `;
}
