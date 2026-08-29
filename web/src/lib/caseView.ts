/**
 * Composed read model for the Results screen (doc 6). Joins the persisted case
 * row to the townships / gauge / fleet / shelters it references and reconstructs
 * the two water-route paths for the map. Routing paths are recomputed on read
 * (they reflect current `passable` state); distances + notes are the
 * assessment-time record stored on the row.
 */
import { getFloodCase, listGauges, listNetworkEdges, listShelters, listTownships, listUnits } from "./repo";
import { buildGraph, dijkstraFull, reconstructPath } from "./domain/routing";
import type { FloodCase, GaugeStation } from "./schema";

export interface RoutePoint {
  id: string;
  display_name: string;
  lat: number;
  lng: number;
}

export interface CaseView {
  case: FloodCase;
  township: RoutePoint & { hazard_tier: string };
  gauge_station: (Pick<GaugeStation, "id" | "river" | "danger_level_cm">) | null;
  assigned_unit:
    | (RoutePoint & { mobility: string; medical_support: boolean; distance: number | null })
    | null;
  assigned_shelter:
    | (RoutePoint & { capability: string; distance: number | null })
    | null;
  routes: { unit: RoutePoint[] | null; shelter: RoutePoint[] | null };
}

export async function getCaseView(caseId: string): Promise<CaseView | null> {
  const c = await getFloodCase(caseId);
  if (!c) return null;

  const [townships, gauges, units, shelters, edges] = await Promise.all([
    listTownships(),
    listGauges(),
    listUnits(),
    listShelters(),
    listNetworkEdges(),
  ]);

  const tById = new Map(townships.map((t) => [t.id, t]));
  const incident = tById.get(c.township_id);
  if (!incident) return null; // data-integrity failure — caller returns 404/500

  const gauge = incident.gauge_station_id
    ? gauges.find((g) => g.id === incident.gauge_station_id) ?? null
    : null;

  const full = dijkstraFull(buildGraph(edges), c.township_id);
  const pointFor = (id: string): RoutePoint | null => {
    const t = tById.get(id);
    return t ? { id: t.id, display_name: t.display_name, lat: t.lat, lng: t.lng } : null;
  };
  const pathPoints = (targetTownshipId: string): RoutePoint[] | null => {
    if (!full) return null;
    const ids = reconstructPath(full.prev, targetTownshipId);
    if (!ids) return null;
    const pts = ids.map(pointFor).filter((p): p is RoutePoint => p !== null);
    return pts.length === ids.length ? pts : null;
  };

  const view: CaseView = {
    case: c,
    township: {
      id: incident.id,
      display_name: incident.display_name,
      lat: incident.lat,
      lng: incident.lng,
      hazard_tier: incident.hazard_tier,
    },
    gauge_station: gauge
      ? { id: gauge.id, river: gauge.river, danger_level_cm: gauge.danger_level_cm }
      : null,
    assigned_unit: null,
    assigned_shelter: null,
    routes: { unit: null, shelter: null },
  };

  if (c.assigned_unit_id) {
    const u = units.find((x) => x.id === c.assigned_unit_id);
    const home = u ? tById.get(u.home_township_id) : undefined;
    if (u && home) {
      view.assigned_unit = {
        id: u.id,
        display_name: home.display_name,
        lat: home.lat,
        lng: home.lng,
        mobility: u.mobility,
        medical_support: u.medical_support,
        distance: c.assigned_unit_distance,
      };
      view.routes.unit = pathPoints(u.home_township_id);
    }
  }

  if (c.assigned_shelter_id) {
    const s = shelters.find((x) => x.id === c.assigned_shelter_id);
    const town = s ? tById.get(s.township_id) : undefined;
    if (s && town) {
      view.assigned_shelter = {
        id: s.id,
        display_name: s.display_name,
        lat: town.lat,
        lng: town.lng,
        capability: s.capability,
        distance: c.assigned_shelter_distance,
      };
      view.routes.shelter = pathPoints(s.township_id);
    }
  }

  return view;
}
