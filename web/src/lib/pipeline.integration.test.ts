/**
 * PHASE 3 ACCEPTANCE TEST (CLAUDE.md DoD) — the real Lemyethna case, end to end.
 *
 * Runs only against a live stack:
 *   1. web/.env has a real DATABASE_URL (not the [PASSWORD] placeholder)
 *   2. the Prolog reasoning service is up:  npm run prolog   (separate terminal)
 * Otherwise the whole suite is skipped, so `npm test` stays green during dev.
 *
 *   npm run prolog                 # terminal 1
 *   npm run test:integration       # terminal 2
 */
import { describe, it, expect, beforeEach } from "vitest";
import { runFloodCasePipeline } from "./pipeline";
import { transitionCase } from "./lifecycle";
import { getFloodCase } from "./repo";
import { sql } from "./db";
import { resetFixtures, setEdgePassable } from "./testing/fixtures";
import { prologHealthy } from "./prolog";
import type { ReportFormInput } from "./reportInput";

const dbConfigured =
  !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("[PASSWORD]");

/** The doc-7 Lemyethna case in the v2 report-form vocabulary. */
const LEMYETHNA_REPORT: ReportFormInput = {
  township_id: "lemyethna",
  river_level: null,
  gauge_reading_cm: 1250, // exact — reproduces doc 7 exactly
  embankment: "breached",
  rainfall: "heavy",
  upstream_rain: "72h_plus",
  landform: "low_lying_plain",
  road: "inaccessible",
  vulnerable_groups: ["elderly", "children"],
  injured: "yes",
  people_affected: "over_10000",
};

describe.skipIf(!dbConfigured)("Phase 3 acceptance — live stack", () => {
  beforeEach(async () => {
    if (!(await prologHealthy())) {
      throw new Error("Prolog service not reachable — run `npm run prolog` first");
    }
    await resetFixtures();
  });

  it("the worked example produces the doc-7 response exactly", async () => {
    const r = await runFloodCasePipeline(LEMYETHNA_REPORT);

    expect(r.case_id).toMatch(/^FLD-\d{8}-\d{3}$/);
    expect(r.township_id).toBe("lemyethna");
    expect(r.status).toBe("assessed");
    expect(r.severity).toBe("severe");
    expect(r.severity_reason).toBe("embankment_breach_override");
    expect(r.recommended_action).toBe("Evacuate immediately");
    expect(r.required_capabilities).toEqual(["motorized", "medical_support"]);
    expect(r.priority_score).toBe(56);
    expect(r.priority_band).toBe("critical");
    expect(r.assigned_unit).toEqual({
      id: "RB-01",
      home_township_id: "yegyi",
      distance_to_incident: 3,
    });
    expect(r.assigned_shelter).toEqual({
      id: "S-03",
      display_name: "Pathein General Hospital Annex",
      distance_to_incident: 9,
    });
    expect(r.notes).toEqual([
      "RB-02, stationed AT Lemyethna, was excluded — no medic aboard",
      "Lemyethna Monastery (nearest shelter, distance 0) lacks medical capability for this case",
    ]);
  });

  it("reserves RB-01 and S-03 atomically with the response", async () => {
    await runFloodCasePipeline(LEMYETHNA_REPORT);
    const [[unit], [shelter]] = await Promise.all([
      sql`select status from rescue_unit where id = 'RB-01'`,
      sql`select status from shelter where id = 'S-03'`,
    ]);
    expect(unit.status).toBe("reserved");
    expect(shelter.status).toBe("reserved_full");
  });

  it("concurrency (doc 8 §18.3): two identical reports — the second cannot get RB-01", async () => {
    const [a, b] = await Promise.allSettled([
      runFloodCasePipeline(LEMYETHNA_REPORT),
      runFloodCasePipeline(LEMYETHNA_REPORT),
    ]);
    expect(a.status).toBe("fulfilled");
    expect(b.status).toBe("fulfilled");
    const units = [a, b].map((x) => (x as PromiseFulfilledResult<Awaited<ReturnType<typeof runFloodCasePipeline>>>).value.assigned_unit?.id);
    // exactly one of them gets RB-01; the other falls back (RB-05) or to null
    expect(units.filter((u) => u === "RB-01")).toHaveLength(1);
    expect(units).not.toEqual(["RB-01", "RB-01"]);
  });

  it("lifecycle: dispatch then resolve releases the unit and shelter", async () => {
    const { case_id } = await runFloodCasePipeline(LEMYETHNA_REPORT);

    await transitionCase(case_id, "dispatch");
    const [dep] = await sql`select status from rescue_unit where id = 'RB-01'`;
    expect(dep.status).toBe("deployed");

    await transitionCase(case_id, "resolve");
    const [[u], [s], c] = await Promise.all([
      sql`select status from rescue_unit where id = 'RB-01'`,
      sql`select status from shelter where id = 'S-03'`,
      getFloodCase(case_id),
    ]);
    expect(u.status).toBe("available");
    expect(s.status).toBe("accepting");
    expect(c?.status).toBe("resolved");
  });

  it("unknown township_id -> 422 invalid_request, no case written", async () => {
    await expect(
      runFloodCasePipeline({ ...LEMYETHNA_REPORT, township_id: "atlantis" }),
    ).rejects.toMatchObject({ code: "invalid_request", status: 422 });
  });

  it("negative gauge_reading_cm -> 422 (doc 8 §18.8)", async () => {
    await expect(
      runFloodCasePipeline({ ...LEMYETHNA_REPORT, gauge_reading_cm: -1 }),
    ).rejects.toMatchObject({ status: 422 });
  });

  // ---- doc 8 §18.7: routing edge cases, end to end ----------------------

  it("blocked Lemyethna→Yegyi edge: the worked example routes to the next-best unit (RB-05), not an error", async () => {
    await setEdgePassable("lemyethna", "yegyi", false);
    try {
      const r = await runFloodCasePipeline(LEMYETHNA_REPORT);
      // RB-01 (Yegyi) is now far; RB-05 (Bogale, distance 16) is the next candidate
      // that still satisfies {motorized, medical_support}.
      expect(r.assigned_unit).toEqual({
        id: "RB-05",
        home_township_id: "bogale",
        distance_to_incident: 16,
      });
      // the compound-filter exclusion note for the co-located RB-02 still fires
      expect(r.notes).toContain("RB-02, stationed AT Lemyethna, was excluded — no medic aboard");
    } finally {
      await setEdgePassable("lemyethna", "yegyi", true);
    }
  });

  // ---- doc 8 §18.8 + edge-case table: fail-safe behaviour --------------

  it("coastal township, not breached -> 422 incomplete_assessment (no river gauge; storm-surge gap)", async () => {
    await expect(
      runFloodCasePipeline({
        ...LEMYETHNA_REPORT,
        township_id: "labutta",
        embankment: "intact",
        river_level: null,
        gauge_reading_cm: null,
      }),
    ).rejects.toMatchObject({ code: "incomplete_assessment", status: 422 });
  });

  it("coastal township, breached -> 200 severe via the override, gauge_percent null", async () => {
    const r = await runFloodCasePipeline({
      ...LEMYETHNA_REPORT,
      township_id: "labutta",
      embankment: "breached",
      river_level: null,
      gauge_reading_cm: null,
    });
    expect(r.severity).toBe("severe");
    expect(r.severity_reason).toBe("embankment_breach_override");
    const c = await getFloodCase(r.case_id);
    expect(c?.gauge_percent).toBeNull();
  });

  it("breached but gauge still below the danger level -> still severe (edge-case table)", async () => {
    const r = await runFloodCasePipeline({
      ...LEMYETHNA_REPORT,
      gauge_reading_cm: 500, // exact, well under Ngathaingchaung's 1160 cm
    });
    expect(r.severity).toBe("severe");
    expect(r.severity_reason).toBe("embankment_breach_override");
  });

  it("two reports for the same township are NOT merged — two distinct cases (edge-case table)", async () => {
    const a = await runFloodCasePipeline(LEMYETHNA_REPORT);
    const b = await runFloodCasePipeline(LEMYETHNA_REPORT);
    expect(a.case_id).not.toBe(b.case_id);
    expect((await getFloodCase(a.case_id))?.status).toBe("assessed");
    expect((await getFloodCase(b.case_id))?.status).toBe("assessed");
  });

  it("lifecycle: resolving twice is idempotent; cancelling a resolved case is a 409 (edge-case table)", async () => {
    const { case_id } = await runFloodCasePipeline(LEMYETHNA_REPORT);
    await transitionCase(case_id, "resolve");
    const again = await transitionCase(case_id, "resolve"); // no-op
    expect(again.status).toBe("resolved");
    await expect(transitionCase(case_id, "cancel")).rejects.toMatchObject({ status: 409 });
  });

  it("resolving a never-dispatched case still moves it to resolved and frees resources (edge-case table)", async () => {
    const { case_id } = await runFloodCasePipeline(LEMYETHNA_REPORT);
    await transitionCase(case_id, "resolve"); // straight from 'assessed'
    const [[u], [s], c] = await Promise.all([
      sql`select status from rescue_unit where id = 'RB-01'`,
      sql`select status from shelter where id = 'S-03'`,
      getFloodCase(case_id),
    ]);
    expect(u.status).toBe("available");
    expect(s.status).toBe("accepting");
    expect(c?.status).toBe("resolved");
  });
});
