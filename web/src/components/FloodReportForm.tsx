"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import type { GaugeStation, Township } from "@/lib/schema";
import type { FloodCaseInput } from "@/lib/validation";
import {
  SelectField,
  ToggleSwitch,
  Stepper,
  RadioCards,
  Segmented,
  FieldBlock,
} from "./controls";

/** Qualitative water level → approx % of the station danger mark (doc 6). */
const WATER_LEVELS = [
  { value: "well_below", label: "Well below the danger mark", pct: 0.6 },
  { value: "somewhat_below", label: "A little below the danger mark", pct: 0.85 },
  { value: "at", label: "Right at the danger mark", pct: 1.0 },
  { value: "above", label: "Above the danger mark", pct: 1.08 },
  { value: "well_above", label: "Well above the danger mark", pct: 1.25 },
] as const;

type WaterKey = (typeof WATER_LEVELS)[number]["value"];

export function FloodReportForm() {
  const router = useRouter();
  const [townships, setTownships] = useState<Township[] | null>(null);
  const [gauges, setGauges] = useState<GaugeStation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [townshipId, setTownshipId] = useState<string>("");
  const [water, setWater] = useState<WaterKey | "">("");
  const [gaugeCm, setGaugeCm] = useState<string>("");
  const [useExactCm, setUseExactCm] = useState(false);
  const [rainDays, setRainDays] = useState<number>(0);
  const [rainfall, setRainfall] = useState<FloodCaseInput["local_rainfall"] | null>(null);
  const [breached, setBreached] = useState(false);
  const [terrain, setTerrain] = useState<FloodCaseInput["terrain"] | null>(null);
  const [roadsCut, setRoadsCut] = useState(false);
  const [vulnerable, setVulnerable] = useState(false);
  const [injured, setInjured] = useState(false);
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
    if (!hasGauge) return 0;
    if (useExactCm) return Number(gaugeCm) || 0;
    const lvl = WATER_LEVELS.find((w) => w.value === water);
    return lvl ? Math.round(danger! * lvl.pct) : 0;
  }, [hasGauge, useExactCm, gaugeCm, water, danger]);

  const ready =
    !!townshipId &&
    !!rainfall &&
    !!terrain &&
    population !== "" &&
    (hasGauge ? (useExactCm ? gaugeCm !== "" : water !== "") : true);

  async function submit() {
    if (!ready) return;
    setSubmitting(true);
    setSubmitError(null);
    const input: FloodCaseInput = {
      township_id: townshipId,
      gauge_reading_cm: gaugeReadingCm,
      upstream_heavy_rain_days: rainDays,
      local_rainfall: rainfall!,
      embankment_status: breached ? "breached" : "intact",
      terrain: terrain!,
      road_status: roadsCut ? "impassable" : "open",
      vulnerable_present: vulnerable,
      injured_survivors: injured,
      affected_population: Number(population) || 0,
    };
    try {
      const res = await api.submitReport(input);
      router.push(`/results/${encodeURIComponent(res.case_id)}`);
    } catch (e) {
      setSubmitError(
        e instanceof ApiClientError || e instanceof Error
          ? e.message
          : "Something went wrong submitting the report.",
      );
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
      className="space-y-7"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {/* dropdown */}
      <SelectField
        label="Which township?"
        value={townshipId}
        placeholder="Choose a township…"
        options={townships.map((t) => ({
          value: t.id,
          label: t.display_name + (t.is_base ? " (base)" : ""),
        }))}
        onChange={setTownshipId}
      />

      {township && !hasGauge && (
        <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
          This township is on the coast. Its main flood risk is cyclone storm surge, which this
          version does not assess. A river-gauge answer isn&apos;t needed — but if the embankment is
          breached the system will still flag it as severe.
        </p>
      )}

      {/* dropdown (water) with a typed-number fallback */}
      {township && hasGauge && (
        <div>
          {!useExactCm ? (
            <SelectField
              label="How high is the river here?"
              hint={`The danger mark for this township's gauge is ${danger} cm.`}
              value={water}
              placeholder="Choose one…"
              options={WATER_LEVELS.map((w) => ({ value: w.value, label: w.label }))}
              onChange={setWater}
            />
          ) : (
            <FieldBlock
              label="Gauge reading (cm)"
              hint={`The danger mark for this township's gauge is ${danger} cm.`}
            >
              <input
                type="number"
                min={0}
                value={gaugeCm}
                onChange={(e) => setGaugeCm(e.target.value)}
                className="w-full rounded-lg border-2 border-border bg-surface px-3 py-3 font-semibold"
              />
            </FieldBlock>
          )}
          <button
            type="button"
            onClick={() => setUseExactCm((v) => !v)}
            className="mt-2 text-sm font-semibold text-accent underline"
          >
            {useExactCm ? "Use the simple choice instead" : "I have an exact gauge reading in cm"}
          </button>
        </div>
      )}

      {/* stepper */}
      <Stepper
        label="Heavy rain upstream"
        hint="Consecutive days of heavy rain in the catchment upstream."
        value={rainDays}
        min={0}
        max={7}
        onChange={setRainDays}
        format={(n) => (n === 0 ? "None" : n === 1 ? "1 day" : `${n} days`)}
      />

      {/* segmented (short options) */}
      <Segmented
        label="Local rainfall right now"
        value={rainfall}
        options={[
          { value: "light", label: "Light" },
          { value: "moderate", label: "Moderate" },
          { value: "heavy", label: "Heavy" },
          { value: "very_heavy", label: "Very heavy" },
        ]}
        onChange={setRainfall}
      />

      {/* radio list */}
      <RadioCards
        label="What is the land like where people are?"
        value={terrain}
        options={[
          { value: "low_lying", label: "Low-lying", hint: "Floods first, water sits longer" },
          { value: "elevated", label: "Higher ground", hint: "Naturally drains, floods later" },
        ]}
        onChange={setTerrain}
      />

      {/* toggle switches */}
      <div className="space-y-3">
        <ToggleSwitch
          label="Embankment breached"
          hint="A break in the embankment — turn on only if you have seen or been told of one."
          checked={breached}
          onChange={setBreached}
          danger
        />
        <ToggleSwitch
          label="Roads cut off"
          hint="Vehicles can no longer reach this place by road."
          checked={roadsCut}
          onChange={setRoadsCut}
        />
        <ToggleSwitch
          label="Elderly, disabled, or very young people at risk"
          checked={vulnerable}
          onChange={setVulnerable}
        />
        <ToggleSwitch label="Someone is injured" checked={injured} onChange={setInjured} />
      </div>

      {/* number with quick picks */}
      <FieldBlock label="Roughly how many people are affected?">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={population}
          onChange={(e) => setPopulation(e.target.value)}
          placeholder="e.g. 500"
          className="w-full rounded-lg border-2 border-border bg-surface px-3 py-3 font-semibold"
        />
        <div className="flex flex-wrap gap-2">
          {["50", "500", "5000", "40000"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPopulation(n)}
              className="rounded-full border-2 border-border bg-surface px-3 py-1 text-sm font-semibold"
            >
              {Number(n).toLocaleString()}
            </button>
          ))}
        </div>
      </FieldBlock>

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
