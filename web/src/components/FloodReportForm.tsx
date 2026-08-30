"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import type { GaugeStation, Township } from "@/lib/schema";
import type { FloodCaseInput } from "@/lib/validation";

/** Qualitative water level → approx % of the station danger mark (doc 6). */
const WATER_LEVELS = [
  { key: "well_below", label: "Well below the mark", pct: 0.6 },
  { key: "near", label: "Near the mark", pct: 0.95 },
  { key: "above", label: "Above the mark", pct: 1.08 },
  { key: "well_above", label: "Well above the mark", pct: 1.25 },
] as const;

type WaterKey = (typeof WATER_LEVELS)[number]["key"];

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 2,
}: {
  label: string;
  value: T | null;
  options: ReadonlyArray<{ key: T; label: string }>;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{label}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={value === o.key}
            onClick={() => onChange(o.key)}
            className={`rounded-lg border-2 px-3 py-3 text-left font-semibold transition ${
              value === o.key
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface hover:border-accent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function FloodReportForm() {
  const router = useRouter();
  const [townships, setTownships] = useState<Township[] | null>(null);
  const [gauges, setGauges] = useState<GaugeStation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [townshipId, setTownshipId] = useState("");
  const [water, setWater] = useState<WaterKey | null>("near");
  const [gaugeCm, setGaugeCm] = useState<string>("");
  const [useExactCm, setUseExactCm] = useState(false);
  const [rainDays, setRainDays] = useState<number>(0);
  const [rainfall, setRainfall] = useState<FloodCaseInput["local_rainfall"] | null>("moderate");
  const [embankment, setEmbankment] = useState<FloodCaseInput["embankment_status"] | null>("intact");
  const [terrain, setTerrain] = useState<FloodCaseInput["terrain"] | null>(null);
  const [road, setRoad] = useState<FloodCaseInput["road_status"] | null>("open");
  const [vulnerable, setVulnerable] = useState<boolean | null>(null);
  const [injured, setInjured] = useState<boolean | null>(null);
  const [population, setPopulation] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.townships(), api.gauges()])
      .then(([t, g]) => {
        setTownships(t.sort((a, b) => a.display_name.localeCompare(b.display_name)));
        setGauges(g);
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Could not load form data"));
  }, []);

  const township = townships?.find((t) => t.id === townshipId) ?? null;
  const danger = useMemo(() => {
    if (!township?.gauge_station_id || !gauges) return null;
    return gauges.find((g) => g.id === township.gauge_station_id)?.danger_level_cm ?? null;
  }, [township, gauges]);

  const hasGauge = danger !== null;

  const gaugeReadingCm = useMemo(() => {
    if (!hasGauge) return 0; // coastal / no station — API still needs a value
    if (useExactCm) return Number(gaugeCm) || 0;
    const lvl = WATER_LEVELS.find((w) => w.key === water);
    return lvl ? Math.round(danger! * lvl.pct) : 0;
  }, [hasGauge, useExactCm, gaugeCm, water, danger]);

  const ready =
    townshipId &&
    rainfall &&
    embankment &&
    terrain &&
    road &&
    vulnerable !== null &&
    injured !== null &&
    population !== "" &&
    (hasGauge ? (useExactCm ? gaugeCm !== "" : water !== null) : true);

  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    setSubmitError(null);
    const input: FloodCaseInput = {
      township_id: townshipId,
      gauge_reading_cm: gaugeReadingCm,
      upstream_heavy_rain_days: rainDays,
      local_rainfall: rainfall!,
      embankment_status: embankment!,
      terrain: terrain!,
      road_status: road!,
      vulnerable_present: vulnerable!,
      injured_survivors: injured!,
      affected_population: Number(population) || 0,
    };
    try {
      const res = await api.submitReport(input);
      router.push(`/results/${encodeURIComponent(res.case_id)}`);
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Something went wrong submitting the report.";
      setSubmitError(msg);
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <p className="rounded-lg border-2 border-sev-severe bg-white p-4 font-semibold">
        {loadError} — is the API running?
      </p>
    );
  }
  if (!townships) return <p className="text-muted">Loading…</p>;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-2">
        <label htmlFor="township" className="font-semibold">
          Which township?
        </label>
        <select
          id="township"
          value={townshipId}
          onChange={(e) => setTownshipId(e.target.value)}
          className="w-full rounded-lg border-2 border-border bg-surface px-3 py-3 font-semibold"
        >
          <option value="">Choose a township…</option>
          {townships.map((t) => (
            <option key={t.id} value={t.id}>
              {t.display_name}
              {t.is_base ? " (base)" : ""}
            </option>
          ))}
        </select>
      </div>

      {township && !hasGauge && (
        <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
          This township is on the coast. Its main flood risk is cyclone storm surge, which this
          version does not assess. A river-gauge answer isn&apos;t needed — but if the embankment is
          breached the system will still flag it as severe.
        </p>
      )}

      {township && hasGauge && (
        <div className="space-y-2">
          {!useExactCm ? (
            <Segmented
              label="How high is the river?"
              value={water}
              onChange={setWater}
              options={WATER_LEVELS.map((w) => ({ key: w.key, label: w.label }))}
              columns={2}
            />
          ) : (
            <div className="space-y-2">
              <label htmlFor="cm" className="font-semibold">
                Gauge reading (cm) — danger mark is {danger} cm
              </label>
              <input
                id="cm"
                type="number"
                min={0}
                value={gaugeCm}
                onChange={(e) => setGaugeCm(e.target.value)}
                className="w-full rounded-lg border-2 border-border bg-surface px-3 py-3 font-semibold"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => setUseExactCm((v) => !v)}
            className="text-sm font-semibold text-accent underline"
          >
            {useExactCm ? "Use the simple choice instead" : "I have an exact gauge reading in cm"}
          </button>
        </div>
      )}

      <Segmented
        label="Is the embankment holding?"
        value={embankment}
        onChange={setEmbankment}
        options={[
          { key: "intact", label: "Intact" },
          { key: "breached", label: "Breached" },
        ]}
      />

      <Segmented
        label="What is the land like here?"
        value={terrain}
        onChange={setTerrain}
        options={[
          { key: "low_lying", label: "Low-lying" },
          { key: "elevated", label: "Higher ground" },
        ]}
      />

      <Segmented
        label="Local rainfall right now"
        value={rainfall}
        onChange={setRainfall}
        options={[
          { key: "light", label: "Light" },
          { key: "moderate", label: "Moderate" },
          { key: "heavy", label: "Heavy" },
          { key: "very_heavy", label: "Very heavy" },
        ]}
      />

      <Segmented
        label="Heavy rain upstream — how many days?"
        value={String(rainDays) as "0" | "1" | "2" | "3"}
        onChange={(v) => setRainDays(Number(v))}
        options={[
          { key: "0", label: "None" },
          { key: "1", label: "1 day" },
          { key: "2", label: "2 days" },
          { key: "3", label: "3+ days" },
        ]}
        columns={4}
      />

      <Segmented
        label="Can vehicles reach this place by road?"
        value={road}
        onChange={setRoad}
        options={[
          { key: "open", label: "Roads open" },
          { key: "impassable", label: "Roads cut off" },
        ]}
      />

      <Segmented
        label="Are there elderly, disabled, or very young people at risk?"
        value={vulnerable === null ? null : vulnerable ? "yes" : "no"}
        onChange={(v) => setVulnerable(v === "yes")}
        options={[
          { key: "yes", label: "Yes" },
          { key: "no", label: "No" },
        ]}
      />

      <Segmented
        label="Anyone injured?"
        value={injured === null ? null : injured ? "yes" : "no"}
        onChange={(v) => setInjured(v === "yes")}
        options={[
          { key: "yes", label: "Yes" },
          { key: "no", label: "No" },
        ]}
      />

      <div className="space-y-2">
        <label htmlFor="pop" className="font-semibold">
          Roughly how many people are affected?
        </label>
        <input
          id="pop"
          type="number"
          min={0}
          inputMode="numeric"
          value={population}
          onChange={(e) => setPopulation(e.target.value)}
          placeholder="e.g. 500"
          className="w-full rounded-lg border-2 border-border bg-surface px-3 py-3 font-semibold"
        />
      </div>

      {submitError && (
        <p className="rounded-lg border-2 border-sev-severe bg-white p-3 font-semibold text-sev-severe">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || submitting}
        className="w-full rounded-xl bg-accent px-4 py-4 text-lg font-extrabold text-white disabled:opacity-50"
      >
        {submitting ? "Getting a recommendation…" : "Get recommendation"}
      </button>
    </form>
  );
}
