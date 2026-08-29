"use client";

import { LazyMap } from "./map/LazyMap";
import type { MapPoint, MapRoute } from "./map/MapView";
import type { CaseView } from "@/lib/caseView";

/** Report → Results map: incident + assigned unit + assigned shelter, one route line each. */
export function IncidentMap({ view }: { view: CaseView }) {
  const points: MapPoint[] = [
    {
      lat: view.township.lat,
      lng: view.township.lng,
      label: `Incident — ${view.township.display_name}`,
      kind: "incident",
    },
  ];
  const routes: MapRoute[] = [];

  if (view.assigned_unit) {
    points.push({
      lat: view.assigned_unit.lat,
      lng: view.assigned_unit.lng,
      label: `${view.assigned_unit.id} — ${view.assigned_unit.display_name}`,
      sub: `Rescue boat · ${view.assigned_unit.distance ?? "?"} units away`,
      kind: "unit",
    });
  }
  if (view.assigned_shelter) {
    points.push({
      lat: view.assigned_shelter.lat,
      lng: view.assigned_shelter.lng,
      label: view.assigned_shelter.display_name,
      sub: `Shelter · ${view.assigned_shelter.distance ?? "?"} units away`,
      kind: "shelter",
    });
  }
  if (view.routes.unit && view.routes.unit.length > 1) {
    routes.push({ points: view.routes.unit, color: "#1d4ed8" });
  }
  if (view.routes.shelter && view.routes.shelter.length > 1) {
    routes.push({ points: view.routes.shelter, color: "#15803d" });
  }

  return <LazyMap points={points} routes={routes} height={340} />;
}
