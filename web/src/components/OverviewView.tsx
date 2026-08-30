"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { FloodCase, Township } from "@/lib/schema";
import { SEVERITY, CASE_STATUS, PRIORITY_BAND } from "@/lib/format";
import { SeverityBadge } from "./SeverityBadge";
import { RegionalMap } from "./RegionalMap";

export function OverviewView() {
  const [cases, setCases] = useState<FloodCase[] | null>(null);
  const [closed, setClosed] = useState<FloodCase[] | null>(null);
  const [townships, setTownships] = useState<Township[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listCases(), api.listCases("resolved,cancelled"), api.townships()])
      .then(([active, done, t]) => {
        setCases(active);
        setClosed(
          [...done].sort((a, b) => +new Date(b.reported_at) - +new Date(a.reported_at)),
        );
        setTownships(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load cases"));
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border-2 border-sev-severe bg-white p-4 font-semibold">{error}</p>
    );
  }
  if (!cases || !closed || !townships) return <p className="text-muted">Loading…</p>;

  const townshipName = (id: string) =>
    townships.find((x) => x.id === id)?.display_name ?? id;

  return (
    <div className="space-y-5">
      <Link
        href="/report"
        data-btn
        className="inline-flex rounded-xl bg-accent-strong px-5 py-3 font-extrabold text-white"
      >
        File a report →
      </Link>

      <RegionalMap cases={cases} townships={townships} />

      <section>
        <h2 className="mb-2 font-bold">
          Active cases ({cases.length}) · open, assessed, and dispatched
        </h2>
        {cases.length === 0 ? (
          <p className="text-muted">No active cases right now.</p>
        ) : (
          <ul className="space-y-2">
            {cases.map((c) => {
              const t = townships.find((x) => x.id === c.township_id);
              return (
                <li key={c.case_id}>
                  <Link
                    href={`/results/${encodeURIComponent(c.case_id)}`}
                    className={`flex items-center justify-between gap-3 rounded-xl border-l-8 border border-border bg-surface p-3 ${
                      c.severity ? SEVERITY[c.severity].ringClass : ""
                    }`}
                  >
                    <div>
                      <p className="font-bold">{t?.display_name ?? c.township_id}</p>
                      <p className="text-sm text-muted">
                        {c.case_id} · {CASE_STATUS[c.status].label} · priority{" "}
                        {c.priority_band ? PRIORITY_BAND[c.priority_band].label : "—"} ({c.priority_score}/59)
                      </p>
                    </div>
                    {c.severity && <SeverityBadge severity={c.severity} size="sm" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <details className="rounded-xl border border-border bg-surface">
          <summary className="cursor-pointer list-none p-3 font-bold marker:content-none">
            Closed cases ({closed.length}) · resolved and cancelled
          </summary>
          <ul className="border-t border-border">
            {closed.map((c) => (
              <li key={c.case_id} className="border-b border-border last:border-b-0">
                <Link
                  href={`/results/${encodeURIComponent(c.case_id)}`}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div>
                    <p className="font-semibold">{townshipName(c.township_id)}</p>
                    <p className="text-sm text-muted">
                      {c.case_id} · {CASE_STATUS[c.status].label} ·{" "}
                      {new Date(c.reported_at).toLocaleDateString()}
                    </p>
                  </div>
                  {c.severity && <SeverityBadge severity={c.severity} size="sm" />}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
