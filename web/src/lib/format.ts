/** Display config — plain, non-technical labels (doc 6 / NFR-4). */
import type { SeverityLevel, PriorityBand, CaseStatus, LocalRainfall } from "./schema";

export const SEVERITY: Record<
  SeverityLevel,
  { label: string; chipClass: string; ringClass: string; hex: string; blurb: string }
> = {
  severe: {
    label: "Severe",
    chipClass: "sev-severe",
    ringClass: "sev-ring-severe",
    hex: "#b3160f",
    blurb: "Life-threatening. Evacuate now.",
  },
  high: {
    label: "High",
    chipClass: "sev-high",
    ringClass: "sev-ring-high",
    hex: "#c2410c",
    blurb: "Get ready to evacuate. Move vulnerable people first.",
  },
  moderate: {
    label: "Moderate",
    chipClass: "sev-moderate",
    ringClass: "sev-ring-moderate",
    hex: "#a15c07",
    blurb: "Watch closely. Report more often.",
  },
  low: {
    label: "Low",
    chipClass: "sev-low",
    ringClass: "sev-ring-low",
    hex: "#15803d",
    blurb: "Routine monitoring.",
  },
};

export const PRIORITY_BAND: Record<PriorityBand, { label: string }> = {
  critical: { label: "Critical" },
  high: { label: "High" },
  moderate: { label: "Moderate" },
  low: { label: "Low" },
};

export const CASE_STATUS: Record<CaseStatus, { label: string }> = {
  open: { label: "Open" },
  assessed: { label: "Assessed" },
  dispatched: { label: "Responder dispatched" },
  resolved: { label: "Resolved" },
  cancelled: { label: "Cancelled" },
};

export const SEVERITY_REASON_TEXT: Record<string, string> = {
  embankment_breach_override:
    "Rated Severe because the embankment is breached — this overrides the river gauge. A breach can sometimes be addressed directly (temporary repair, sandbagging).",
  gauge_derived:
    "Rated from the river gauge reading, the terrain, and local rainfall.",
};

export function rainfallLabel(r: LocalRainfall): string {
  return { light: "Light", moderate: "Moderate", heavy: "Heavy", very_heavy: "Very heavy" }[r];
}

export function capabilityLabel(c: string): string {
  return c === "motorized"
    ? "Engine-powered boat"
    : c === "medical_support"
      ? "Medic on board"
      : c === "medical_equipped"
        ? "Medical-equipped shelter"
        : c;
}
