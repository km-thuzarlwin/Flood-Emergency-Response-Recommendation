import { describe, it, expect } from "vitest";
import { scorePriority, priorityBand, MAX_PRIORITY_SCORE, type PriorityInputs } from "./priority";

const BASE: PriorityInputs = {
  embankment_status: "intact",
  gauge_percent: 0,
  upstream_heavy_rain_days: 0,
  local_rainfall: "light",
  road_status: "open",
  vulnerable_present: false,
  injured_survivors: false,
  affected_population: 0,
};

describe("priority scoring (doc 5)", () => {
  it("reproduces the worked example: 56 / critical", () => {
    const r = scorePriority({
      embankment_status: "breached",
      gauge_percent: 108,
      upstream_heavy_rain_days: 3,
      local_rainfall: "heavy",
      road_status: "impassable",
      vulnerable_present: true,
      injured_survivors: true,
      affected_population: 39_000,
    });
    expect(r.breakdown).toEqual({
      embankment_breached: 12,
      gauge_band: 8,
      upstream_heavy_rain: 4,
      local_rainfall: 5,
      road_impassable: 6,
      vulnerable_present: 7,
      injured_survivors: 6,
      affected_population: 8,
    });
    expect(r.score).toBe(56);
    expect(r.band).toBe("critical");
  });

  it("all-zero inputs score 0 / low", () => {
    const r = scorePriority(BASE);
    expect(r.score).toBe(0);
    expect(r.band).toBe("low");
  });

  it("maxes out at 59", () => {
    const r = scorePriority({
      embankment_status: "breached",
      gauge_percent: 130,
      upstream_heavy_rain_days: 3,
      local_rainfall: "very_heavy",
      road_status: "impassable",
      vulnerable_present: true,
      injured_survivors: true,
      affected_population: 50_000,
    });
    expect(r.score).toBe(MAX_PRIORITY_SCORE);
  });

  it("gauge band cut-points: <70 / 70 / 100 / 115", () => {
    const at = (p: number) => scorePriority({ ...BASE, gauge_percent: p }).breakdown.gauge_band;
    expect(at(69)).toBe(0);
    expect(at(70)).toBe(3);
    expect(at(99)).toBe(3);
    expect(at(100)).toBe(8);
    expect(at(114)).toBe(8);
    expect(at(115)).toBe(10);
    expect(scorePriority({ ...BASE, gauge_percent: null }).breakdown.gauge_band).toBe(0);
  });

  it("population tiers: 99 / 100 / 500 / 2000 / 10000", () => {
    const at = (n: number) =>
      scorePriority({ ...BASE, affected_population: n }).breakdown.affected_population;
    expect(at(99)).toBe(0);
    expect(at(100)).toBe(2);
    expect(at(499)).toBe(2);
    expect(at(500)).toBe(4);
    expect(at(1_999)).toBe(4);
    expect(at(2_000)).toBe(6);
    expect(at(9_999)).toBe(6);
    expect(at(10_000)).toBe(8);
  });

  it("upstream rain only counts at >= 3 days", () => {
    expect(scorePriority({ ...BASE, upstream_heavy_rain_days: 2 }).breakdown.upstream_heavy_rain).toBe(0);
    expect(scorePriority({ ...BASE, upstream_heavy_rain_days: 3 }).breakdown.upstream_heavy_rain).toBe(4);
  });

  it("band boundaries: 10/11, 25/26, 40/41", () => {
    expect(priorityBand(10)).toBe("low");
    expect(priorityBand(11)).toBe("moderate");
    expect(priorityBand(25)).toBe("moderate");
    expect(priorityBand(26)).toBe("high");
    expect(priorityBand(40)).toBe("high");
    expect(priorityBand(41)).toBe("critical");
  });

  it("score is never negative and never exceeds 59 (doc 8 §18.6)", () => {
    const rainfalls = ["light", "moderate", "heavy", "very_heavy"] as const;
    for (const gp of [null, 0, 69, 70, 114, 115, 200]) {
      for (const rf of rainfalls) {
        for (const emb of ["intact", "breached"] as const) {
          const r = scorePriority({
            embankment_status: emb,
            gauge_percent: gp,
            upstream_heavy_rain_days: 5,
            local_rainfall: rf,
            road_status: "impassable",
            vulnerable_present: true,
            injured_survivors: true,
            affected_population: 999_999,
          });
          expect(r.score).toBeGreaterThanOrEqual(0);
          expect(r.score).toBeLessThanOrEqual(59);
        }
      }
    }
  });

  it("property (randomised, doc 8 §18.6): 0 ≤ score ≤ 59 and band matches the score for any input", () => {
    const rainfalls = ["light", "moderate", "heavy", "very_heavy"] as const;
    const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
    for (let i = 0; i < 500; i++) {
      const r = scorePriority({
        embankment_status: pick(["intact", "breached"] as const),
        gauge_percent: Math.random() < 0.15 ? null : Math.floor(Math.random() * 260) - 20,
        upstream_heavy_rain_days: Math.floor(Math.random() * 8),
        local_rainfall: pick(rainfalls),
        road_status: pick(["open", "impassable"] as const),
        vulnerable_present: Math.random() < 0.5,
        injured_survivors: Math.random() < 0.5,
        affected_population: Math.floor(Math.random() * 60_000) - 100,
      });
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(59);
      expect(r.band).toBe(priorityBand(r.score));
    }
  });
});
