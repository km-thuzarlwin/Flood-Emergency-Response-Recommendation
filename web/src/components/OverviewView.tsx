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
  const [townships, setTownships] = useState<Township[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listCases(), api.townships()])
      .then(([c, t]) => {
        setCases(c);
        setTownships(t);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load cases"));
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border-2 border-sev-severe bg-white p-4 font-semibold">{error}</p>
    );
  }
  if (!cases || !townships) return <p className="text-muted">Loading…</p>;

  return (
    <div className="space-y-5">
      <RegionalMap cases={cases} townships={townships} />

      <section>
        <h2 className="mb-2 font-bold">
          Active cases ({cases.length}) · open, assessed, and dispatched
        </h2>
        {cases.length === 0 ? (
          <p className="text-muted">
            No active cases.{" "}
            <Link href="/report" className="font-semibold text-accent underline">
              File a report
            </Link>
            .
          </p>
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
    </div>
  );
}
