"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import type { CaseView } from "@/lib/caseView";
import { SEVERITY, PRIORITY_BAND, CASE_STATUS, capabilityLabel } from "@/lib/format";
import { SeverityBadge } from "./SeverityBadge";
import { WhyTrace } from "./WhyTrace";
import { IncidentMap } from "./IncidentMap";

export function ResultsView({ caseId }: { caseId: string }) {
  const [view, setView] = useState<CaseView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .caseView(caseId)
      .then((v) => {
        setView(v);
        setError(null);
      })
      .catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) {
          setError(`Case ${caseId} was not found — it may have been resolved, cancelled, or cleared.`);
        } else if (e instanceof ApiClientError && e.status >= 500) {
          setError("Couldn't reach the database just now. Give it a moment and retry.");
        } else {
          setError(e instanceof Error ? e.message : "Could not load this case.");
        }
      });
  }, [caseId]);

  useEffect(load, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-sev-severe bg-white p-4">
        <p className="font-semibold">{error}</p>
        <button
          onClick={() => {
            setError(null);
            load();
          }}
          className="mt-3 rounded-lg border-2 border-border px-4 py-2 text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }
  if (!view) return <p className="text-muted">Loading recommendation…</p>;

  const c = view.case;
  const sev = c.severity ? SEVERITY[c.severity] : null;

  return (
    <div className="space-y-5">
      {/* headline */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted">
              {view.township.display_name} · case {c.case_id}
            </p>
            <p className="mt-1 text-sm text-muted">{CASE_STATUS[c.status].label}</p>
          </div>
          {c.severity && <SeverityBadge severity={c.severity} size="lg" />}
        </div>
        <p className="mt-4 text-2xl font-extrabold leading-tight">{c.recommended_action}</p>
        {sev && <p className="mt-1 text-muted">{sev.blurb}</p>}
        <p className="mt-3 text-sm">
          Priority{" "}
          <strong>
            {c.priority_band ? PRIORITY_BAND[c.priority_band].label : "—"}
          </strong>{" "}
          ({c.priority_score}/59) · needs:{" "}
          {(c.required_capabilities ?? []).map(capabilityLabel).join(", ") || "no special capability"}
        </p>
      </section>

      {/* map */}
      <IncidentMap view={view} />

      {/* assignments */}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-bold">Rescue boat</h2>
          {view.assigned_unit ? (
            <p className="mt-1">
              <strong>{view.assigned_unit.id}</strong> from {view.assigned_unit.display_name} ·{" "}
              {view.assigned_unit.distance} units away
              <br />
              <span className="text-sm text-muted">
                {view.assigned_unit.mobility === "motorized" ? "Engine-powered" : "Non-motorized"}
                {view.assigned_unit.medical_support ? " · medic aboard" : " · no medic"}
              </span>
            </p>
          ) : (
            <p className="mt-1 font-semibold text-sev-severe">
              None available — escalate for manual coordination.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="font-bold">Shelter</h2>
          {view.assigned_shelter ? (
            <p className="mt-1">
              <strong>{view.assigned_shelter.display_name}</strong> ·{" "}
              {view.assigned_shelter.distance} units away
              <br />
              <span className="text-sm text-muted">
                {view.assigned_shelter.capability === "medical_equipped"
                  ? "Medical-equipped"
                  : "General shelter"}
              </span>
            </p>
          ) : (
            <p className="mt-1 font-semibold text-sev-severe">
              None accepting — escalate for manual coordination.
            </p>
          )}
        </section>
      </div>

      {/* notes — why not the closer resource */}
      {c.notes.length > 0 && (
        <section className="rounded-xl border border-border bg-surface-2 p-4">
          <h2 className="font-bold">Notes</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {c.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {/* assumptions — every Unknown / mapped answer from the report (doc 6 v2) */}
      {c.assumptions?.length > 0 && (
        <section className="rounded-xl border border-border bg-surface-2 p-4">
          <h2 className="font-bold">Assumptions made</h2>
          <p className="mt-1 text-xs text-muted">
            Where the report said &ldquo;unknown&rdquo; or an in-between answer, this is how it was
            read. Check these against what you know on the ground.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {c.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      <WhyTrace view={view} />

      {/* actions */}
      <section className="flex flex-wrap gap-3">
        {c.status === "assessed" && (
          <button
            onClick={() => act(() => api.dispatch(c.case_id))}
            disabled={busy}
            className="rounded-xl bg-accent-ink px-5 py-3 font-extrabold text-white disabled:opacity-50"
          >
            Confirm &amp; dispatch responder
          </button>
        )}
        {c.status === "dispatched" && (
          <button
            onClick={() => act(() => api.resolve(c.case_id))}
            disabled={busy}
            className="rounded-xl bg-sev-low px-5 py-3 font-extrabold text-white disabled:opacity-50"
          >
            Mark resolved
          </button>
        )}
        {(c.status === "assessed" || c.status === "dispatched") && (
          <button
            onClick={() => act(() => api.cancel(c.case_id))}
            disabled={busy}
            className="rounded-xl border-2 border-border px-5 py-3 font-bold disabled:opacity-50"
          >
            Cancel report
          </button>
        )}
      </section>

      {(c.status === "resolved" || c.status === "cancelled") && (
        <p className="text-muted">
          This case is {CASE_STATUS[c.status].label.toLowerCase()}.
        </p>
      )}

      <nav className="flex flex-wrap gap-4 border-t border-border pt-4 text-sm font-semibold text-accent-ink">
        <Link href="/overview" className="underline">
          Regional overview
        </Link>
        <Link href="/report" className="underline">
          File another report
        </Link>
      </nav>
    </div>
  );
}
