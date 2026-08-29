"use client";

import { LazyMap } from "./map/LazyMap";
import type { MapPoint } from "./map/MapView";
import { SEVERITY } from "@/lib/format";
import type { FloodCase, Township } from "@/lib/schema";

/** Regional overview map: one pin per case, coloured by severity (doc 6 §13.3). */
export function RegionalMap({
  cases,
  townships,
}: {
  cases: FloodCase[];
  townships: Township[];
}) {
  const tById = new Map(townships.map((t) => [t.id, t]));
  const points: MapPoint[] = [];
  for (const c of cases) {
    const t = tById.get(c.township_id);
    if (!t) continue;
    points.push({
      lat: t.lat,
      lng: t.lng,
      label: `${t.display_name} · ${c.case_id}`,
      sub: c.severity ? SEVERITY[c.severity].label : c.status,
      kind: "case",
      color: c.severity ? SEVERITY[c.severity].hex : "#6b7280",
    });
  }
  if (points.length === 0) {
    return (
      <div className="grid h-[340px] place-items-center rounded-xl border border-border bg-surface-2 text-muted">
        No active cases to show
      </div>
    );
  }
  return <LazyMap points={points} height={340} />;
}
