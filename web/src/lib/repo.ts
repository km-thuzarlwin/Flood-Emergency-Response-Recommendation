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

// ---------------------------------------------------------------------------
// The DB is a pooled Supabase instance a region away — the first query after a
// cold start can be slow or hit a stale pooled connection. Two mitigations:
//   * retry transient connection errors a couple of times
//   * memoise the reference tables (townships / gauges / network edges), which
//     are set by migrations and never change at runtime
// Neither touches the transactional write paths (reservation.ts / lifecycle.ts).
// ---------------------------------------------------------------------------

const TRANSIENT = /CONNECT|ECONNRESET|ETIMEDOUT|EPIPE|terminat|closed|socket|timeout/i;

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (i === tries - 1 || !TRANSIENT.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  throw last;
}

const REF_TTL_MS = 5 * 60_000;
const refCache = new Map<string, { at: number; val: unknown }>();

function cachedRef<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = refCache.get(key);
  if (hit && Date.now() - hit.at < REF_TTL_MS) return Promise.resolve(hit.val as T);
  return withRetry(fn).then((val) => {
    refCache.set(key, { at: Date.now(), val });
    return val;
  });
}

export interface TownshipWithGauge extends Township {
  danger_level_cm: number | null;
  gauge_river: string | null;
}

export async function getTownshipWithGauge(id: string): Promise<TownshipWithGauge | null> {
  const all = await cachedRef("townships_with_gauge", () => sql<TownshipWithGauge[]>`
    select t.id, t.display_name, t.district, t.hazard_tier, t.gauge_station_id,
           t.lat, t.lng, t.is_base,
           g.danger_level_cm as danger_level_cm,
           g.river          as gauge_river
    from township t
    left join gauge_station g on g.id = t.gauge_station_id
  `);
  return all.find((t) => t.id === id) ?? null;
}

export async function listNetworkEdges(): Promise<Edge[]> {
  // not cached — `passable` is operator-maintained and can change at runtime (doc 2 §5.3)
  return withRetry(() => sql<Edge[]>`
    select from_township_id, to_township_id, distance::float8 as distance, passable
    from network_edge
  `);
}

export async function listUnits(): Promise<RescueUnit[]> {
  return withRetry(() => sql<RescueUnit[]>`
    select id, home_township_id, status, mobility, medical_support, capacity
    from rescue_unit order by id
  `);
}

export async function listUnitRows(): Promise<UnitRow[]> {
  return withRetry(() => sql<UnitRow[]>`
    select id, home_township_id, status, mobility, medical_support
    from rescue_unit
  `);
}

export async function listShelters(): Promise<Shelter[]> {
  return withRetry(() => sql<Shelter[]>`
    select id, display_name, township_id, status, capability, capacity
    from shelter order by id
  `);
}

export async function listShelterRows(): Promise<ShelterRow[]> {
  return withRetry(() => sql<ShelterRow[]>`
    select id, display_name, township_id, status, capability
    from shelter
  `);
}

export async function listTownships(): Promise<Township[]> {
  return cachedRef("townships", () => sql<Township[]>`
    select id, display_name, district, hazard_tier, gauge_station_id, lat, lng, is_base
    from township order by id
  `);
}

export async function listGauges(): Promise<GaugeStation[]> {
  return cachedRef("gauges", () => sql<GaugeStation[]>`
    select id, river, danger_level_cm, source_note
    from gauge_station order by id
  `);
}

export async function getFloodCase(caseId: string): Promise<FloodCase | null> {
  const rows = await withRetry(() => sql<FloodCase[]>`
    select * from flood_case where case_id = ${caseId}
  `);
  return rows[0] ?? null;
}

export async function listFloodCases(statuses?: string[]): Promise<FloodCase[]> {
  if (statuses && statuses.length > 0) {
    return withRetry(() => sql<FloodCase[]>`
      select * from flood_case
      where status in ${sql(statuses)}
      order by priority_score desc nulls last, reported_at asc
    `);
  }
  return withRetry(() => sql<FloodCase[]>`
    select * from flood_case
    order by priority_score desc nulls last, reported_at asc
  `);
}
