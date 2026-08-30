import { describe, it, expect } from "vitest";
import { mapReportToReasoner, reportFormSchema, type ReportFormInput } from "./reportInput";

/** The doc-7 Lemyethna report in the v2 form vocabulary. */
const LEMYETHNA_FORM: ReportFormInput = {
  township_id: "lemyethna",
  river_level: "above",
  gauge_reading_cm: null,
  embankment: "breached",
  rainfall: "heavy",
  upstream_rain: "72h_plus",
  landform: "low_lying_plain",
  road: "inaccessible",
  vulnerable_groups: ["elderly", "disabilities"],
  injured: "yes",
  people_affected: "over_10000",
};

describe("mapReportToReasoner — the worked example (doc 7)", () => {
  const { input, assumptions } = mapReportToReasoner(LEMYETHNA_FORM, 1160);

  it("produces the doc-7 FloodCaseInput", () => {
    expect(input).toEqual({
      township_id: "lemyethna",
      gauge_reading_cm: Math.round(1160 * 1.08), // 1253 → gauge_percent 108, same band as doc 7's 1250
      upstream_heavy_rain_days: 3,
      local_rainfall: "heavy",
      embankment_status: "breached",
      terrain: "low_lying",
      road_status: "impassable",
      vulnerable_present: true,
      injured_survivors: true,
      affected_population: 20000,
    });
  });

  it("makes no assumptions for a fully-specified report", () => {
    expect(assumptions).toEqual([]);
  });

  it("an exact gauge reading overrides the river-level choice", () => {
    const { input: i } = mapReportToReasoner({ ...LEMYETHNA_FORM, gauge_reading_cm: 1250 }, 1160);
    expect(i.gauge_reading_cm).toBe(1250);
  });
});

describe("mapReportToReasoner — Unknown / in-between values never inflate", () => {
  const base: ReportFormInput = {
    township_id: "yegyi",
    river_level: "at_mark",
    gauge_reading_cm: null,
    embankment: "intact",
    rainfall: "moderate",
    upstream_rain: "none",
    landform: "riverbank",
    road: "accessible",
    vulnerable_groups: [],
    injured: "no",
    people_affected: "under_100",
  };

  it("embankment 'at risk' and 'unknown' both map to intact + a note", () => {
    for (const emb of ["at_risk", "unknown"] as const) {
      const { input, assumptions } = mapReportToReasoner({ ...base, embankment: emb }, 1160);
      expect(input.embankment_status).toBe("intact");
      expect(assumptions.some((a) => a.toLowerCase().includes("embankment"))).toBe(true);
    }
  });

  it("only a confirmed breach maps to breached (no note)", () => {
    const { input, assumptions } = mapReportToReasoner({ ...base, embankment: "breached" }, 1160);
    expect(input.embankment_status).toBe("breached");
    expect(assumptions).toEqual([]);
  });

  it("rainfall 'no_rain' and 'unknown' behave like light; only 'unknown' notes it", () => {
    expect(mapReportToReasoner({ ...base, rainfall: "no_rain" }, 1160).input.local_rainfall).toBe("light");
    expect(mapReportToReasoner({ ...base, rainfall: "no_rain" }, 1160).assumptions).toEqual([]);
    const u = mapReportToReasoner({ ...base, rainfall: "unknown" }, 1160);
    expect(u.input.local_rainfall).toBe("light");
    expect(u.assumptions.some((a) => a.toLowerCase().includes("rainfall"))).toBe(true);
  });

  it("landform: everything → low_lying except 'other' → elevated + note", () => {
    for (const lf of ["riverbank", "low_lying_plain", "island", "farmland"] as const) {
      expect(mapReportToReasoner({ ...base, landform: lf }, 1160).input.terrain).toBe("low_lying");
    }
    const o = mapReportToReasoner({ ...base, landform: "other" }, 1160);
    expect(o.input.terrain).toBe("elevated");
    expect(o.assumptions.some((a) => a.toLowerCase().includes("landform"))).toBe(true);
  });

  it("road: only 'inaccessible' → impassable; 'limited'/'unknown' → open + note", () => {
    expect(mapReportToReasoner({ ...base, road: "inaccessible" }, 1160).input.road_status).toBe("impassable");
    for (const r of ["limited", "unknown"] as const) {
      const m = mapReportToReasoner({ ...base, road: r }, 1160);
      expect(m.input.road_status).toBe("open");
      expect(m.assumptions.some((a) => a.toLowerCase().includes("road"))).toBe(true);
    }
  });

  it("injured 'unknown' → not injured + a note (no medic reserved)", () => {
    const m = mapReportToReasoner({ ...base, injured: "unknown" }, 1160);
    expect(m.input.injured_survivors).toBe(false);
    expect(m.assumptions.some((a) => a.toLowerCase().includes("injur"))).toBe(true);
  });

  it("upstream buckets → days 0/1/2/3/0; only 'unknown' notes it", () => {
    const days = (b: ReportFormInput["upstream_rain"]) =>
      mapReportToReasoner({ ...base, upstream_rain: b }, 1160).input.upstream_heavy_rain_days;
    expect(days("none")).toBe(0);
    expect(days("24h")).toBe(1);
    expect(days("48h")).toBe(2);
    expect(days("72h_plus")).toBe(3);
    expect(days("unknown")).toBe(0);
    expect(mapReportToReasoner({ ...base, upstream_rain: "unknown" }, 1160).assumptions.length).toBe(1);
  });

  it("vulnerable groups → boolean; any ticked = true", () => {
    expect(mapReportToReasoner({ ...base, vulnerable_groups: [] }, 1160).input.vulnerable_present).toBe(false);
    expect(
      mapReportToReasoner({ ...base, vulnerable_groups: ["pregnant"] }, 1160).input.vulnerable_present,
    ).toBe(true);
  });

  it("people ranges → 50 / 300 / 1000 / 5000 / 20000", () => {
    const v = (k: ReportFormInput["people_affected"]) =>
      mapReportToReasoner({ ...base, people_affected: k }, 1160).input.affected_population;
    expect(v("under_100")).toBe(50);
    expect(v("100_500")).toBe(300);
    expect(v("500_2000")).toBe(1000);
    expect(v("2000_10000")).toBe(5000);
    expect(v("over_10000")).toBe(20000);
  });

  it("coastal township (no danger level, no exact reading) → gauge_reading_cm 0", () => {
    const { input } = mapReportToReasoner({ ...base, township_id: "labutta", river_level: null }, null);
    expect(input.gauge_reading_cm).toBe(0);
  });
});

describe("reportFormSchema", () => {
  it("rejects an unknown enum value", () => {
    expect(reportFormSchema.safeParse({ ...LEMYETHNA_FORM, road: "sometimes" }).success).toBe(false);
  });
  it("rejects a negative exact gauge reading", () => {
    expect(
      reportFormSchema.safeParse({ ...LEMYETHNA_FORM, gauge_reading_cm: -1 }).success,
    ).toBe(false);
  });
  it("defaults river_level, gauge_reading_cm, vulnerable_groups", () => {
    const parsed = reportFormSchema.parse({
      township_id: "yegyi",
      embankment: "intact",
      rainfall: "light",
      upstream_rain: "none",
      landform: "riverbank",
      road: "accessible",
      injured: "no",
      people_affected: "under_100",
    });
    expect(parsed.river_level).toBeNull();
    expect(parsed.gauge_reading_cm).toBeNull();
    expect(parsed.vulnerable_groups).toEqual([]);
  });
});
