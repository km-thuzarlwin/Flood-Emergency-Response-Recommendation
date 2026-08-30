"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import type { GaugeStation, Township } from "@/lib/schema";
import type { ReportFormInput } from "@/lib/reportInput";
import { RIVER_LEVELS, PEOPLE_RANGES } from "@/lib/reportInput";
import { Field, TapGrid, SearchSelect, StatusRamp, MultiTiles } from "./reportControls";

type Rf = ReportFormInput;

export function FloodReportForm() {
  const router = useRouter();
  const [townships, setTownships] = useState<Township[] | null>(null);
  const [gauges, setGauges] = useState<GaugeStation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [townshipId, setTownshipId] = useState<string | null>(null);
  const [riverLevel, setRiverLevel] = useState<Rf["river_level"]>(null);
  const [exactCm, setExactCm] = useState<string>("");
  const [useExact, setUseExact] = useState(false);
  const [embankment, setEmbankment] = useState<Rf["embankment"] | null>(null);
  const [rainfall, setRainfall] = useState<Rf["rainfall"] | null>(null);
  const [upstream, setUpstream] = useState<Rf["upstream_rain"] | null>(null);
  const [landform, setLandform] = useState<Rf["landform"] | null>(null);
  const [road, setRoad] = useState<Rf["road"] | null>(null);
  const [groups, setGroups] = useState<Rf["vulnerable_groups"]>([]);
  const [injured, setInjured] = useState<Rf["injured"] | null>(null);
  const [people, setPeople] = useState<Rf["people_affected"] | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.townships(), api.gauges()])
      .then(([t, g]) => {
        setTownships([...t].sort((a, b) => a.display_name.localeCompare(b.display_name)));
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

  const riverAnswered = !hasGauge || (useExact ? exactCm !== "" : riverLevel !== null);
  const ready =
    !!townshipId && riverAnswered && !!embankment && !!rainfall && !!upstream && !!landform && !!road && !!injured && !!people;

  async function submit() {
    if (!ready || !townshipId) return;
    setSubmitting(true);
    setSubmitError(null);
    const form: ReportFormInput = {
      township_id: townshipId,
      river_level: useExact ? null : riverLevel,
      gauge_reading_cm: useExact && exactCm !== "" ? Number(exactCm) : null,
      embankment: embankment!,
      rainfall: rainfall!,
      upstream_rain: upstream!,
      landform: landform!,
      road: road!,
      vulnerable_groups: groups,
      injured: injured!,
      people_affected: people!,
    };
    try {
      const res = await api.submitReport(form);
      router.push(`/results/${encodeURIComponent(res.case_id)}`);
    } catch (e) {
      setSubmitError(
        e instanceof ApiClientError || e instanceof Error ? e.message : "Something went wrong.",
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
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field label="Select the affected township">
        <SearchSelect
          value={townshipId}
          placeholder="Choose a township…"
          onChange={setTownshipId}
          options={townships.map((t) => ({ value: t.id, label: t.display_name + (t.is_base ? " (base)" : "") }))}
        />
      </Field>

      {township && !hasGauge && (
        <p className="rounded-lg bg-surface-2 p-3 text-sm text-muted">
          This township is on the coast — its main flood risk is cyclone storm surge, which this
          version doesn&apos;t assess. No river answer is needed; if the embankment is breached the
          system will still flag it as severe.
        </p>
      )}

      {township && hasGauge && (
        <Field label="Current river level" hint={`Compared with this gauge's danger mark (${danger} cm).`}>
          {!useExact ? (
            <TapGrid
              value={riverLevel}
              onChange={setRiverLevel}
              columns={2}
              options={RIVER_LEVELS.map((l) => ({ value: l.key, label: l.label }))}
            />
          ) : (
            <input
              type="number"
              min={0}
              value={exactCm}
              onChange={(e) => setExactCm(e.target.value)}
              placeholder="Gauge reading in cm"
              className="w-full rounded-xl border-2 border-border bg-surface px-3.5 py-3 text-[15px] font-semibold"
            />
          )}
          <button
            type="button"
            onClick={() => setUseExact((v) => !v)}
            className="mt-2 text-sm font-semibold text-accent underline"
          >
            {useExact ? "Use the simple choice instead" : "I have an exact gauge reading"}
          </button>
        </Field>
      )}

      <Field label="Embankment">
        <TapGrid
          value={embankment}
          onChange={setEmbankment}
          columns={2}
          dangerValue="breached"
          options={[
            { value: "intact", label: "Holding / intact" },
            { value: "at_risk", label: "At risk of failure" },
            { value: "breached", label: "Breached" },
            { value: "unknown", label: "Unknown / can't access" },
          ]}
        />
      </Field>

      <Field label="Current local rainfall">
        <TapGrid
          value={rainfall}
          onChange={setRainfall}
          columns={3}
          options={[
            { value: "no_rain", label: "No rain" },
            { value: "light", label: "Light" },
            { value: "moderate", label: "Moderate" },
            { value: "heavy", label: "Heavy" },
            { value: "very_heavy", label: "Very heavy" },
            { value: "unknown", label: "Unknown" },
          ]}
        />
      </Field>

      <Field
        label="Heavy rain upstream"
        hint="Rain in the catchment upstream — a flood can be on its way even in dry weather here."
      >
        <TapGrid
          value={upstream}
          onChange={setUpstream}
          columns={3}
          options={[
            { value: "none", label: "None" },
            { value: "24h", label: "24 hours" },
            { value: "48h", label: "48 hours" },
            { value: "72h_plus", label: "72 hours +" },
            { value: "unknown", label: "Unknown" },
          ]}
        />
      </Field>

      <Field label="Type of landform">
        <TapGrid
          value={landform}
          onChange={setLandform}
          columns={2}
          options={[
            { value: "riverbank", label: "Riverbank" },
            { value: "low_lying_plain", label: "Low-lying plain" },
            { value: "island", label: "Island" },
            { value: "farmland", label: "Farmland" },
            { value: "other", label: "Other" },
          ]}
        />
      </Field>

      <Field label="Can vehicles reach here by road?">
        <StatusRamp
          value={road}
          onChange={setRoad}
          options={[
            { value: "accessible", kind: "ok", title: "ACCESSIBLE", sub: "Vehicles can reach the area" },
            { value: "limited", kind: "warn", title: "LIMITED", sub: "Some difficulty getting through" },
            { value: "inaccessible", kind: "bad", title: "INACCESSIBLE", sub: "Vehicles cannot reach the area" },
            { value: "unknown", kind: "unknown", title: "UNKNOWN", sub: "Not sure" },
          ]}
        />
      </Field>

      <Field label="Are any of these groups present?" hint="Choose all that apply.">
        <MultiTiles
          value={groups}
          onChange={setGroups}
          options={[
            { value: "elderly", label: "Elderly people" },
            { value: "children", label: "Children" },
            { value: "disabilities", label: "People with disabilities" },
            { value: "pregnant", label: "Pregnant women" },
          ]}
        />
      </Field>

      <Field label="Are there any injured people?">
        <TapGrid
          value={injured}
          onChange={setInjured}
          columns={3}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
            { value: "unknown", label: "Unknown" },
          ]}
        />
        {injured === "unknown" && (
          <p className="rounded-lg border border-border bg-surface-2 p-2.5 text-xs text-muted">
            &ldquo;Unknown&rdquo; won&apos;t reserve a medic — but it&apos;s flagged on the result so the
            coordinator can decide.
          </p>
        )}
      </Field>

      <Field label="Estimated people affected" hint="A rough range — no one can count exactly in a flood.">
        <SearchSelect
          value={people}
          searchable={false}
          placeholder="Choose a range…"
          onChange={setPeople}
          options={PEOPLE_RANGES.map((r) => ({ value: r.key, label: r.label }))}
        />
      </Field>

      {submitError && (
        <p className="rounded-lg border-2 border-sev-severe bg-white p-3 font-semibold text-sev-severe">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || submitting}
        className="min-h-[58px] w-full rounded-xl bg-accent-ink text-lg font-extrabold text-white disabled:opacity-50"
      >
        {submitting ? "Getting a recommendation…" : "Get recommendation"}
      </button>
    </form>
  );
}
