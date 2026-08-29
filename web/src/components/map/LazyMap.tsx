"use client";

import dynamic from "next/dynamic";

/**
 * Leaflet needs a real `window`, so the map is loaded client-only with SSR
 * disabled (doc 6 "Map component" / doc 2). Everything else on the page renders
 * server-or-client as normal.
 */
export const LazyMap = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[320px] place-items-center rounded-xl border border-border bg-surface-2 text-muted">
      Loading map…
    </div>
  ),
});
