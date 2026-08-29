/**
 * Client for the FERRS Prolog reasoning service (see ../../prolog/README.md).
 *
 * The Prolog service owns severity / recommended_action / required_capabilities
 * (doc 4). This module is the only place the Next.js side talks to it.
 *
 * Fail-safe mapping (NFR-1 / doc 8 §18.8):
 *   - service unreachable, timeout, non-JSON, or malformed body -> PrologUnavailableError  (API: 503)
 *   - service returns 422 (bad/insufficient facts)              -> PrologIncompleteError   (API: 422)
 * Never returns a guessed or partial assessment.
 */
import { env, PROLOG_DEFAULT_URL } from "./env";

export { PROLOG_DEFAULT_URL };

export type Severity = "low" | "moderate" | "high" | "severe";
export type Capability = "motorized" | "medical_support";

export interface PrologFacts {
  township_id: string;
  /** current reading at the township's gauge; omit only when embankment_status === "breached" */
  gauge_reading_cm?: number;
  /** the referenced gauge station's danger level; omit only when breached */
  danger_level_cm?: number;
  embankment_status: "intact" | "breached";
  terrain: "low_lying" | "elevated";
  local_rainfall: "light" | "moderate" | "heavy" | "very_heavy";
  road_status: "open" | "impassable";
  injured_survivors: boolean;
}

export interface PrologAssessment {
  township_id: string;
  severity: Severity;
  severity_reason: "embankment_breach_override" | "gauge_derived";
  gauge_percent: number | null;
  base_band: Severity | null;
  recommended_action: string;
  required_capabilities: Capability[];
  required_shelter_capabilities: Array<"medical_equipped">;
}

export class PrologUnavailableError extends Error {
  readonly httpStatus = 503;
}
export class PrologIncompleteError extends Error {
  readonly httpStatus = 422;
  constructor(message: string, readonly detail?: unknown) {
    super(message);
  }
}

const TIMEOUT_MS = 5000;

export async function assessSeverity(facts: PrologFacts): Promise<PrologAssessment> {
  let res: Response;
  try {
    res = await fetch(`${env.FERRS_PROLOG_URL}/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(facts),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (cause) {
    throw new PrologUnavailableError(
      `Prolog reasoning service did not respond at ${env.FERRS_PROLOG_URL}`,
      { cause },
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    // reachable but returning malformed/empty -> treat as unreachable (doc 8 §18.8)
    throw new PrologUnavailableError("Prolog reasoning service returned a non-JSON response");
  }

  if (res.status === 422) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? (body as { detail?: unknown }).detail
        : undefined;
    throw new PrologIncompleteError("Prolog could not produce an assessment", detail);
  }
  if (!res.ok) {
    throw new PrologUnavailableError(`Prolog reasoning service error (HTTP ${res.status})`);
  }

  if (!isAssessment(body)) {
    throw new PrologUnavailableError("Prolog reasoning service returned an unexpected shape");
  }
  return body;
}

export async function prologHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${env.FERRS_PROLOG_URL}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function isAssessment(x: unknown): x is PrologAssessment {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.severity === "string" &&
    typeof o.recommended_action === "string" &&
    Array.isArray(o.required_capabilities) &&
    Array.isArray(o.required_shelter_capabilities)
  );
}
