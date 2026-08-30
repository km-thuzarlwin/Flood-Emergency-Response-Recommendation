/**
 * Browser-side API client. Every call hits the real FERRS API routes (Phase 4
 * gate: not stubbed). On a non-2xx it throws `ApiClientError` carrying the
 * server's `{ error, detail }` so screens can show the real reason.
 */
import type { CaseView } from "./caseView";
import type { FloodCase, GaugeStation, RescueUnit, Shelter, Township } from "./schema";
import type { FloodCaseResponse } from "./pipeline";
import type { ReportFormInput } from "./reportInput";

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(detail || code);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      (body as { error?: string }).error ?? "error",
      (body as { detail?: string }).detail ?? res.statusText,
    );
  }
  return body as T;
}

export const api = {
  townships: () => req<{ townships: Township[] }>("/api/townships").then((r) => r.townships),
  gauges: () => req<{ gauges: GaugeStation[] }>("/api/gauges").then((r) => r.gauges),
  units: () => req<{ units: RescueUnit[] }>("/api/units").then((r) => r.units),
  shelters: () => req<{ shelters: Shelter[] }>("/api/shelters").then((r) => r.shelters),

  listCases: (status?: string) =>
    req<{ cases: FloodCase[] }>(`/api/cases${status ? `?status=${encodeURIComponent(status)}` : ""}`).then(
      (r) => r.cases,
    ),

  submitReport: (form: ReportFormInput) =>
    req<FloodCaseResponse>("/api/flood-case", { method: "POST", body: JSON.stringify(form) }),

  caseView: (id: string) => req<CaseView>(`/api/flood-case/${encodeURIComponent(id)}`),

  dispatch: (id: string) =>
    req<FloodCase>(`/api/flood-case/${encodeURIComponent(id)}/dispatch`, { method: "POST" }),
  resolve: (id: string) =>
    req<FloodCase>(`/api/flood-case/${encodeURIComponent(id)}/resolve`, { method: "POST" }),
  cancel: (id: string) =>
    req<FloodCase>(`/api/flood-case/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
};
