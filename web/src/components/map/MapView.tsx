"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MarkerKind = "incident" | "unit" | "shelter" | "case";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  kind: MarkerKind;
  /** ring colour for case pins on the overview */
  color?: string;
}

export interface MapRoute {
  points: Array<{ lat: number; lng: number }>;
  color: string;
  label?: string;
}

const KIND_STYLE: Record<MarkerKind, { bg: string; glyph: string }> = {
  incident: { bg: "#b3160f", glyph: "!" },
  unit: { bg: "#1d4ed8", glyph: "⚓" }, // anchor
  shelter: { bg: "#15803d", glyph: "⌂" }, // house
  case: { bg: "#6b7280", glyph: "●" },
};

function pinIcon(p: MapPoint): L.DivIcon {
  const s = KIND_STYLE[p.kind];
  const bg = p.color ?? s.bg;
  return L.divIcon({
    className: "",
    html: `<div style="
        width:30px;height:30px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${bg};border:3px solid #fff;
        box-shadow:0 1px 4px rgba(0,0,0,.5);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:#fff;font-weight:800;font-size:15px;line-height:1;">${s.glyph}</span>
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 10);
      return;
    }
    map.fitBounds(
      L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])),
      { padding: [40, 40], maxZoom: 11 },
    );
  }, [map, points]);
  return null;
}

export default function MapView({
  points,
  routes = [],
  height = 320,
}: {
  points: MapPoint[];
  routes?: MapRoute[];
  height?: number;
}) {
  const center: [number, number] = points.length
    ? [points[0].lat, points[0].lng]
    : [17.0, 95.2];

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-border">
      <MapContainer center={center} zoom={9} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={19}
        />
        {routes.map((r, i) => (
          <Polyline
            key={i}
            positions={r.points.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: r.color, weight: 6, opacity: 0.85 }}
          />
        ))}
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={pinIcon(p)}>
            <Popup>
              <strong>{p.label}</strong>
              {p.sub ? <div>{p.sub}</div> : null}
            </Popup>
          </Marker>
        ))}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
