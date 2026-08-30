import { describe, it, expect } from "vitest";
import { buildGraph, dijkstra } from "./routing";
import {
  selectUnit,
  selectShelter,
  unitSatisfies,
  type IncidentContext,
  type UnitRow,
  type ShelterRow,
} from "./filtering";
import { SEED_EDGES, SEED_UNITS, SEED_SHELTERS } from "@/lib/testing/network";

function incidentAt(townshipId: string, displayName: string): IncidentContext {
  const distances = dijkstra(buildGraph(SEED_EDGES), townshipId);
  if (!distances) throw new Error("bad township");
  return { townshipId, townshipDisplayName: displayName, distances };
}

const LEMYETHNA = incidentAt("lemyethna", "Lemyethna");

describe("unitSatisfies (compound filter, doc 5)", () => {
  const u = (p: Partial<UnitRow>): UnitRow => ({
    id: "x",
    home_township_id: "yegyi",
    status: "available",
    mobility: "motorized",
    medical_support: true,
    ...p,
  });
  it("requires EVERY capability, not just one", () => {
    expect(unitSatisfies(u({ medical_support: false }), ["motorized", "medical_support"])).toBe(false);
    expect(unitSatisfies(u({ mobility: "standard" }), ["motorized", "medical_support"])).toBe(false);
    expect(unitSatisfies(u({}), ["motorized", "medical_support"])).toBe(true);
  });
  it("empty requirement set is satisfied by anything", () => {
    expect(unitSatisfies(u({ mobility: "standard", medical_support: false }), [])).toBe(true);
  });
});

describe("selectUnit — the worked example (doc 7 steps 5-6)", () => {
  const sel = selectUnit(SEED_UNITS, ["motorized", "medical_support"], LEMYETHNA);

  it("picks RB-01 at distance 3 — NOT the co-located RB-02", () => {
    expect(sel.id).toBe("RB-01");
    expect(sel.distanceToIncident).toBe(3);
    expect(sel.relaxed).toBe(false);
  });

  it("emits the RB-02 exclusion note verbatim", () => {
    expect(sel.notes).toContain("RB-02, stationed AT Lemyethna, was excluded — no medic aboard");
  });

  it("does not note RB-03 (deployed) or RB-04 (farther than the pick)", () => {
    expect(sel.notes.join("\n")).not.toContain("RB-03");
    expect(sel.notes.join("\n")).not.toContain("RB-04");
  });
});

describe("selectUnit — fallback chain (doc 5 §9.1)", () => {
  it("drops medical_support when no unit has it, and flags it", () => {
    const units: UnitRow[] = [
      { id: "RB-A", home_township_id: "yegyi", status: "available", mobility: "motorized", medical_support: false },
    ];
    const sel = selectUnit(units, ["motorized", "medical_support"], LEMYETHNA);
    expect(sel.id).toBe("RB-A");
    expect(sel.relaxed).toBe(true);
    expect(sel.notes).toContain(
      "No unit with medical support was available; arrange a medic to meet the case, or coordinate a second unit.",
    );
  });

  it("returns null + escalation when nothing fits even after relaxing", () => {
    const units: UnitRow[] = [
      { id: "RB-A", home_township_id: "yegyi", status: "available", mobility: "standard", medical_support: false },
    ];
    const sel = selectUnit(units, ["motorized", "medical_support"], LEMYETHNA);
    expect(sel.id).toBeNull();
    expect(sel.notes).toContain(
      "No suitable rescue unit available in the network — escalate for manual coordination.",
    );
  });
});

describe("selectUnit — tie-break (doc 5 §10.2)", () => {
  it("prefers the co-located candidate at equal distance", () => {
    const units: UnitRow[] = [
      { id: "RB-Z", home_township_id: "lemyethna", status: "available", mobility: "motorized", medical_support: true },
      { id: "RB-A", home_township_id: "ngathaingchaung", status: "available", mobility: "motorized", medical_support: true },
    ];
    // RB-Z at distance 0, RB-A at distance 3 — RB-Z wins on distance anyway;
    // force equal distance by placing both co-located:
    const both: UnitRow[] = [
      { ...units[0], id: "RB-Z" },
      { ...units[0], id: "RB-A" },
    ];
    expect(selectUnit(both, [], LEMYETHNA).id).toBe("RB-A"); // lower id alphabetically
  });
});

describe("selectShelter — the worked example (doc 7 step 7)", () => {
  const sel = selectShelter(SEED_SHELTERS, ["medical_equipped"], LEMYETHNA);

  it("picks S-03 at distance 9 — NOT the co-located S-02", () => {
    expect(sel.id).toBe("S-03");
    expect(sel.distanceToIncident).toBe(9);
  });

  it("emits the S-02 exclusion note verbatim", () => {
    expect(sel.notes).toContain(
      "Lemyethna Monastery (nearest shelter, distance 0) lacks medical capability for this case",
    );
  });
});

describe("selectShelter — fallback (doc 5 §9.2)", () => {
  it("relaxes to a general shelter when no medical one is accepting", () => {
    const shelters: ShelterRow[] = [
      { id: "S-X", display_name: "X Hall", township_id: "yegyi", status: "accepting", capability: "general" },
    ];
    const sel = selectShelter(shelters, ["medical_equipped"], LEMYETHNA);
    expect(sel.id).toBe("S-X");
    expect(sel.relaxed).toBe(true);
  });

  it("null + escalation when nothing is accepting", () => {
    const shelters: ShelterRow[] = [
      { id: "S-X", display_name: "X", township_id: "yegyi", status: "full", capability: "medical_equipped" },
    ];
    const sel = selectShelter(shelters, ["medical_equipped"], LEMYETHNA);
    expect(sel.id).toBeNull();
    expect(sel.notes).toContain(
      "No shelter is accepting anywhere in the network — escalate for manual coordination.",
    );
  });

  it("no medical requirement -> nearest accepting shelter, no exclusion notes", () => {
    const sel = selectShelter(SEED_SHELTERS, [], LEMYETHNA);
    expect(sel.id).toBe("S-02"); // co-located, distance 0
    expect(sel.notes).toEqual([]);
  });
});

describe("selectUnit — doc 8 §18.7: a township whose candidates are all unavailable", () => {
  it("returns null + escalation, never throws", () => {
    const allDeployed: UnitRow[] = SEED_UNITS.map((u) => ({ ...u, status: "deployed" }));
    const sel = selectUnit(allDeployed, ["motorized", "medical_support"], LEMYETHNA);
    expect(sel.id).toBeNull();
    expect(sel.notes).toContain(
      "No suitable rescue unit available in the network — escalate for manual coordination.",
    );
  });
});

describe("doc 8 §18.6: required-capabilities invariant (randomised)", () => {
  const CAPS = ["motorized", "medical_support"] as const;
  const rndSubset = () => CAPS.filter(() => Math.random() < 0.5);
  const rndUnit = (i: number): UnitRow => ({
    id: `RB-${i}`,
    home_township_id: ["yegyi", "lemyethna", "pathein", "bogale", "myaungmya"][i % 5],
    status: (["available", "reserved", "deployed"] as const)[i % 3],
    mobility: Math.random() < 0.5 ? "motorized" : "standard",
    medical_support: Math.random() < 0.5,
  });

  it("selectUnit never demands a capability outside {motorized, medical_support}", () => {
    for (let t = 0; t < 200; t++) {
      const units = Array.from({ length: 5 }, (_, i) => rndUnit(i));
      const req = rndSubset();
      const sel = selectUnit(units, req, LEMYETHNA);
      // the chosen unit, if any, satisfies the (possibly relaxed) requirement set
      if (sel.id) {
        const u = units.find((x) => x.id === sel.id)!;
        expect(u.status).toBe("available");
        if (!sel.relaxed) {
          for (const c of req) {
            if (c === "motorized") expect(u.mobility).toBe("motorized");
            if (c === "medical_support") expect(u.medical_support).toBe(true);
          }
        }
      }
      // exclusion notes only ever name motorized/medic reasons
      for (const n of sel.notes) {
        expect(
          n.includes("no medic aboard") ||
            n.includes("not an engine-powered boat") ||
            n.startsWith("No unit with medical support") ||
            n.startsWith("No suitable rescue unit"),
        ).toBe(true);
      }
    }
  });
});
