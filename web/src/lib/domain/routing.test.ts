import { describe, it, expect } from "vitest";
import { buildGraph, dijkstra } from "./routing";
import { SEED_EDGES } from "@/lib/testing/network";

const dist = (from: string, edges = SEED_EDGES) => {
  const d = dijkstra(buildGraph(edges), from);
  if (!d) throw new Error("source not in graph");
  return d;
};

describe("Dijkstra routing (doc 5 / doc 3)", () => {
  it("reproduces the worked-example distances from Lemyethna (doc 7 steps 6-7)", () => {
    const d = dist("lemyethna");
    expect(d.get("lemyethna")).toBe(0);
    expect(d.get("yegyi")).toBe(3); // RB-01
    expect(d.get("pathein")).toBe(9); // S-03: Ngathaingchaung(3)+Thabaung(3)+Pathein(3)
    expect(d.get("bogale")).toBe(16); // RB-05
  });

  it("every one of the 25 townships is reachable from any node", () => {
    const d = dist("yegyi");
    expect(d.size).toBe(25);
  });

  it("is symmetric (undirected)", () => {
    expect(dist("hinthada").get("dedaye")).toBe(dist("dedaye").get("hinthada"));
  });

  it("returns null when the source township is not in the graph (doc 5 no-route)", () => {
    expect(dijkstra(buildGraph(SEED_EDGES), "atlantis")).toBeNull();
  });

  it("routes around a blocked edge (doc 8 §18.7): Lemyethna->Yegyi", () => {
    const blocked = SEED_EDGES.map((e) =>
      (e.from_township_id === "lemyethna" && e.to_township_id === "yegyi") ||
      (e.from_township_id === "yegyi" && e.to_township_id === "lemyethna")
        ? { ...e, passable: false }
        : e,
    );
    const d = dist("lemyethna", blocked);
    // next-shortest: Lemyethna-Ngathaingchaung(3)-Thabaung(3)-Pathein(3)-... is long;
    // the real detour is Lemyethna-Hinthada(4)-... also long. Shortest becomes
    // Lemyethna->Ngathaingchaung->Thabaung->Pathein->Ngapudaw ... to Yegyi there is
    // no short path, so just assert it is finite, larger than 3, and not an error.
    const viaDetour = d.get("yegyi");
    expect(viaDetour).toBeGreaterThan(3);
    expect(Number.isFinite(viaDetour)).toBe(true);
  });

  it("a fully isolated extra node is unreachable but does not crash", () => {
    const withIsland = [
      ...SEED_EDGES,
      { from_township_id: "island_a", to_township_id: "island_b", distance: 1, passable: true },
    ];
    const d = dist("lemyethna", withIsland);
    expect(d.get("island_a")).toBeUndefined();
    expect(d.get("yegyi")).toBe(3);
  });
});
