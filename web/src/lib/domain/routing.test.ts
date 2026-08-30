import { describe, it, expect } from "vitest";
import { buildGraph, dijkstra, reconstructPath, dijkstraFull, type Edge } from "./routing";
import { SEED_EDGES } from "@/lib/testing/network";

const dist = (from: string, edges = SEED_EDGES) => {
  const d = dijkstra(buildGraph(edges), from);
  if (!d) throw new Error("source not in graph");
  return d;
};

const undirected = (a: string, b: string, w: number): Edge => ({
  from_township_id: a,
  to_township_id: b,
  distance: w,
  passable: true,
});

describe("Dijkstra routing (doc 5 / doc 3)", () => {
  it("reproduces the worked-example distances from Lemyethna (doc 7 steps 6-7)", () => {
    const d = dist("lemyethna");
    expect(d.get("lemyethna")).toBe(0);
    expect(d.get("yegyi")).toBe(3); // RB-01
    expect(d.get("pathein")).toBe(9); // S-03: Ngathaingchaung(3)+Thabaung(3)+Pathein(3)
    expect(d.get("bogale")).toBe(16); // RB-05
  });

  it("every one of the 25 townships is reachable from any node", () => {
    expect(dist("yegyi").size).toBe(25);
    expect(dist("labutta").size).toBe(25);
  });

  it("returns null when the source township is not in the graph (doc 5 no-route)", () => {
    expect(dijkstra(buildGraph(SEED_EDGES), "atlantis")).toBeNull();
  });

  it("reconstructs the incident→shelter path for the worked example", () => {
    const full = dijkstraFull(buildGraph(SEED_EDGES), "lemyethna")!;
    expect(reconstructPath(full.prev, "pathein")).toEqual([
      "lemyethna",
      "ngathaingchaung",
      "thabaung",
      "pathein",
    ]);
  });

  // ---- doc 8 §18.7: routing edge cases -------------------------------------

  it("blocked shortest-path edge → exact next-shortest, on a real network triangle", () => {
    // Mawlamyinegyun—Labutta(3), Mawlamyinegyun—Myaungmya(3), Myaungmya—Labutta(4).
    const before = dist("mawlamyinegyun");
    expect(before.get("labutta")).toBe(3); // direct

    const blocked = SEED_EDGES.map((e) =>
      (e.from_township_id === "mawlamyinegyun" && e.to_township_id === "labutta") ||
      (e.from_township_id === "labutta" && e.to_township_id === "mawlamyinegyun")
        ? { ...e, passable: false }
        : e,
    );
    const after = dist("mawlamyinegyun", blocked);
    expect(after.get("labutta")).toBe(7); // via Myaungmya: 3 + 4 — NOT the blocked 3, NOT an error
  });

  it("blocked Lemyethna→Yegyi edge → still reachable, just longer (never an error)", () => {
    const blocked = SEED_EDGES.map((e) =>
      (e.from_township_id === "lemyethna" && e.to_township_id === "yegyi") ||
      (e.from_township_id === "yegyi" && e.to_township_id === "lemyethna")
        ? { ...e, passable: false }
        : e,
    );
    const d = dist("lemyethna", blocked);
    const detour = d.get("yegyi");
    expect(detour).toBeDefined();
    expect(Number.isFinite(detour)).toBe(true);
    expect(detour!).toBeGreaterThan(3);
  });

  it("a newly-added 26th township on a single bridge edge still resolves", () => {
    const withNode = [...SEED_EDGES, undirected("pathein", "kyaukmyaung", 5)];
    const d = dist("lemyethna", withNode);
    // only way in is via Pathein (distance 9 from Lemyethna) + 5
    expect(d.get("kyaukmyaung")).toBe(14);
    expect(d.size).toBe(26);
  });

  it("a fully isolated extra node is unreachable but does not crash", () => {
    const withIsland = [...SEED_EDGES, undirected("island_a", "island_b", 1)];
    const d = dist("lemyethna", withIsland);
    expect(d.get("island_a")).toBeUndefined();
    expect(d.get("yegyi")).toBe(3);
  });

  // ---- doc 8 §18.6: routing invariants (randomised sweep) ------------------

  it("property: distances are non-negative, symmetric, and obey the triangle inequality", () => {
    const graph = buildGraph(SEED_EDGES);
    const nodes = [...graph.keys()];
    const rnd = () => nodes[Math.floor(Math.random() * nodes.length)];

    for (let i = 0; i < 300; i++) {
      const a = rnd();
      const b = rnd();
      const c = rnd();
      const da = dijkstra(graph, a)!;
      const db = dijkstra(graph, b)!;

      expect(da.get(a)).toBe(0);
      expect(da.get(b)! >= 0).toBe(true);
      expect(da.get(b)).toBe(db.get(a)); // symmetric (undirected)
      // triangle inequality: d(a,c) ≤ d(a,b) + d(b,c)
      expect(da.get(c)!).toBeLessThanOrEqual(da.get(b)! + db.get(c)!);
    }
  });
});
