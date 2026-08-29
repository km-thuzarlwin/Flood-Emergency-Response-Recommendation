/**
 * Shortest-path routing — Handoffs/05-API-and-Backend-Logic.md "Shortest-Path Routing".
 *
 * Dijkstra over the undirected NetworkEdge graph, restricted to `passable` edges.
 * Distances are abstract relative units (doc 2 §5.3), never kilometres.
 * `road_status` does NOT affect this graph (doc 4 §7.5).
 */

export interface Edge {
  from_township_id: string;
  to_township_id: string;
  distance: number;
  passable: boolean;
}

export type DistanceMap = Map<string, number>;

/** Adjacency list from passable edges only, expanded to both directions. */
export function buildGraph(edges: Edge[]): Map<string, Array<{ to: string; w: number }>> {
  const g = new Map<string, Array<{ to: string; w: number }>>();
  const add = (a: string, b: string, w: number) => {
    if (!g.has(a)) g.set(a, []);
    g.get(a)!.push({ to: b, w });
  };
  for (const e of edges) {
    if (!e.passable) continue;
    add(e.from_township_id, e.to_township_id, e.distance);
    add(e.to_township_id, e.from_township_id, e.distance);
  }
  return g;
}

/**
 * Shortest distance from `source` to every reachable township.
 * Binary-heap-free: the graph is tiny (25 nodes), a linear scan per step is fine.
 * Returns `null` if `source` is not a node in the graph (doc 5 "No-route case").
 */
export function dijkstra(
  graph: Map<string, Array<{ to: string; w: number }>>,
  source: string,
): DistanceMap | null {
  if (!graph.has(source)) return null;

  const dist: DistanceMap = new Map([[source, 0]]);
  const visited = new Set<string>();

  for (;;) {
    let u: string | null = null;
    let best = Infinity;
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < best) {
        best = d;
        u = node;
      }
    }
    if (u === null) break;
    visited.add(u);

    for (const { to, w } of graph.get(u) ?? []) {
      const nd = best + w;
      if (nd < (dist.get(to) ?? Infinity)) dist.set(to, nd);
    }
  }
  return dist;
}
