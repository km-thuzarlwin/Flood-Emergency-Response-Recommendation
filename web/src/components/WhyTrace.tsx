import type { CaseView } from "@/lib/caseView";
import { SEVERITY_REASON_TEXT } from "@/lib/format";

/** FR-11 explainability element: gauge station referenced, computed gauge_percent, severity_reason. */
export function WhyTrace({ view }: { view: CaseView }) {
  const c = view.case;
  return (
    <details className="rounded-xl border border-border bg-surface p-4" open>
      <summary className="cursor-pointer font-bold">Why this rating?</summary>
      <div className="mt-3 space-y-2 text-sm">
        <p>{SEVERITY_REASON_TEXT[c.severity_reason ?? "gauge_derived"]}</p>
        {view.gauge_station && c.gauge_percent != null && (
          <p>
            Referenced gauge station <strong>{view.gauge_station.id}</strong> on the{" "}
            {view.gauge_station.river} River. The reading is <strong>{c.gauge_percent}%</strong> of the{" "}
            {view.gauge_station.danger_level_cm}&nbsp;cm danger mark ({c.gauge_reading_cm}&nbsp;cm
            reported).
          </p>
        )}
        <p className="text-muted">
          The 70% / 100% / 115% band cut-points are this project&apos;s own estimate, not official DMH
          thresholds — sanity-check the percentage above against what you know on the ground.
        </p>
      </div>
    </details>
  );
}
