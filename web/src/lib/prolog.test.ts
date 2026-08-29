import { describe, it, expect, vi, afterEach } from "vitest";
import {
  assessSeverity,
  prologHealthy,
  PrologUnavailableError,
  PrologIncompleteError,
  PROLOG_DEFAULT_URL,
} from "./prolog";

const facts = {
  township_id: "lemyethna",
  gauge_reading_cm: 1250,
  danger_level_cm: 1160,
  embankment_status: "breached",
  terrain: "low_lying",
  local_rainfall: "heavy",
  road_status: "impassable",
  injured_survivors: true,
} as const;

afterEach(() => vi.unstubAllGlobals());

describe("prolog client — scaffold sanity", () => {
  it("re-exports a sane default URL", () => {
    expect(PROLOG_DEFAULT_URL).toMatch(/^http/);
  });

  it("passes a healthy assessment straight through", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          township_id: "lemyethna",
          severity: "severe",
          severity_reason: "embankment_breach_override",
          gauge_percent: 108,
          base_band: "high",
          recommended_action: "Evacuate immediately",
          required_capabilities: ["motorized", "medical_support"],
          required_shelter_capabilities: ["medical_equipped"],
        }),
      ),
    );
    const out = await assessSeverity(facts);
    expect(out.severity).toBe("severe");
    expect(out.required_capabilities).toEqual(["motorized", "medical_support"]);
  });

  it("maps a network failure to PrologUnavailableError (=> 503)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }));
    await expect(assessSeverity(facts)).rejects.toBeInstanceOf(PrologUnavailableError);
  });

  it("maps a 422 to PrologIncompleteError (=> 422)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "invalid_request", detail: "x" }, { status: 422 }),
      ),
    );
    await expect(assessSeverity(facts)).rejects.toBeInstanceOf(PrologIncompleteError);
  });

  it("maps a malformed 200 body to PrologUnavailableError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not json", { status: 200 })));
    await expect(assessSeverity(facts)).rejects.toBeInstanceOf(PrologUnavailableError);
  });

  it("prologHealthy() is false when the service is down", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("down");
    }));
    expect(await prologHealthy()).toBe(false);
  });
});
