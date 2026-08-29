# Testing & QA Plan

Distilled from Sections 15 and 18 of the master specification. Phase 5 in `CLAUDE.md` is not done until every category below passes.

## Edge cases & failure modes

| Scenario | Expected behavior |
|---|---|
| No unit satisfies full required-capability set | Fallback — relax medical_support first, flag it; else null assignment + escalation |
| No shelter satisfies capability + availability | Fallback — relax capability before availability; else null + escalation |
| Two candidates exactly equidistant | Tie-break: co-located candidate first, else lower ID alphabetically |
| township_id not in the network graph | 422 validation error |
| A required fact is missing | Prolog fails to prove severity; 422 incomplete_assessment, never a silent default |
| gauge_reading_cm reported but the gauge_station_id mapping is wrong/unverified | Treat any gauge-derived severity as provisional in the UI — the explainability element surfaces the raw percentage for this reason |
| Report submitted for a coastal-tier township | System still runs the riverine rules and returns an answer, but this does not capture the township's real dominant hazard (storm surge) — a known, named gap, not a silent one |
| embankment_status=breached but gauge_reading_cm is still below danger level | Expected and realistic — severity still correctly comes out severe via the override |
| Two reports for the same township within a short window | Not automatically merged — flagged gap, do not build deduplication without being asked |
| Two concurrent cases want the same unit | Whichever reservation completes first wins it |
| SWI-Prolog server unreachable | 503, never a guessed severity |
| A case is resolved twice, or without ever being assessed | No-op on the resource side; Case.status still transitions to resolved |

## 18.1 Unit-level tests for the Prolog rule base

At minimum: one test per severity band boundary (69/70/99/100/114/115 percent), one for the terrain modifier, one for the local-rainfall floor, one confirming the embankment override beats every other input (including a case where gauge_percent alone would only justify "low"), and one test per required_capability rule firing and not firing.

## 18.2 Integration test: the real worked example

`07-Worked-Example-Acceptance-Test.md`'s Lemyethna case, submitted end-to-end, must produce exactly the response documented there. This is the most valuable regression test in the system.

## 18.3 Concurrency test

Submit two cases that would both resolve to the same nearest unit; assert the second correctly gets a different (or null) recommendation.

## 18.4 Gauge-mapping validation

Before trusting the township-to-gauge-station assignments (`03-Regional-Network-and-Seed-Data.md`) operationally, cross-check them against DMH's actual station-to-township convention if that becomes available.

## 18.5 Manual field-style validation

Walk a non-technical reviewer through the Report → Results flow and check whether the recommendation and its explanation make sense to them.

## 18.6 Property-based tests

Rather than fixed cases, assert invariants that should hold for any generated input. **Scope the severity invariant to exactly the four inputs that drive severity** — gauge_reading_cm, embankment_status, terrain, local_rainfall — not to every Case field: severity must never decrease when one of those four strictly worsens, while holding the others fixed. Do NOT assert this for road_status, injured_survivors, vulnerable_present, upstream_heavy_rain_days, or affected_population — none of them are read by the severity rules, only by required_capability or the priority score, so severity correctly does not move when only one of those changes.

Separately: `required_capabilities` must be a subset of `{motorized, medical_support}` for every generated Case; `priority_score` must never exceed 59 or go negative.

## 18.7 Routing edge-case tests

- Set `passable=false` on the one edge that sits on the current shortest path between a candidate unit and the incident township (pick it at random across test runs for coverage, or use the Lemyethna→Yegyi edge specifically) — assert Dijkstra returns the next-shortest remaining route, not the blocked one and not an error.
- A township whose only edges lead to already-reserved or unavailable units/shelters — expect the fallback chain, not a crash.
- Two candidates at equal shortest distance — expect the tie-break to resolve deterministically, not arbitrarily.
- A newly-added 26th township connected by exactly one edge — confirm Dijkstra still resolves correctly from a single bridge edge.

## 18.8 Data-corruption / fail-safe tests

- Negative or physically impossible gauge_reading_cm, or a township_id not present in the network graph — expect a 422 validation error, never a computed severity.
- A gauge_station_id referencing a station absent from the gauge table — expect a 422, not a silent skip of the severity rule.
- SWI-Prolog reachable but returning a malformed or empty response — expect the API route to treat this the same as "unreachable" (503) rather than passing a partial result to the UI.

**The common thread across 18.6–18.8:** when any input or dependency is unreliable, the system should fail toward "manual assessment required," never toward a confident but unsupported recommendation. This is `01-Requirements.md` NFR-1 in test form.
