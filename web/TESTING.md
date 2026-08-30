# FERRS — QA coverage (Phase 5)

Maps every category in `../Handoffs/08-Testing-QA-Plan.md` to the tests that cover it.

## Running

```bash
# Prolog rule base + HTTP service (41 tests)
swipl ../prolog/run_tests.pl

# Web: domain logic + live end-to-end (52 tests)
cd web
npm run prolog            # terminal 1 — the reasoning service must be up for the live tests
npm test                  # terminal 2 — full suite
npm run test:integration  # just the live pipeline suite
```

Current status: **Prolog 41/41 · web 52/52 · tsc / eslint / next build clean.**

The live pipeline suite (`src/lib/pipeline.integration.test.ts`) skips itself unless
`DATABASE_URL` is set (no `[PASSWORD]` placeholder) and the Prolog service answers.
It resets the DB to the doc-7 fixture in `beforeEach` (`src/lib/testing/fixtures.ts`).

## doc 8 category → tests

| doc 8 | Covered by |
|---|---|
| **18.1** Prolog rule base — band boundaries 69/70/99/100/114/115, terrain modifier, rainfall floor, embankment override beats a "would-be-low" case, every `required_capability` rule firing + not firing | `prolog/tests/test_rules.plt` (`rule_units`) |
| **18.2** Worked example end to end → exact doc 5 §12.2 response | `pipeline.integration.test.ts` "the worked example produces the doc-7 response exactly" + a live `POST /api/flood-case` check |
| **18.3** Concurrency — two identical reports, second cannot get the same unit | `pipeline.integration.test.ts` "concurrency (doc 8 §18.3)" |
| **18.4** Gauge-mapping validation vs DMH's real station convention | **External, not code.** The township→station map is a flagged assumption (`../Handoffs/09-Assumptions-and-Provenance.md`); the UI surfaces the raw `gauge_percent` so a responder can sanity-check it (FR-11 / `WhyTrace`). Pending authoritative DMH docs. |
| **18.5** Manual field-style walkthrough | **Done, Phase 4.** Report → Results for the worked example rendered and read correctly in a mobile viewport (SEVERE → "Evacuate immediately", RB-01/S-03 with distances, the exclusion notes, the "Why?" trace). |
| **18.6** Property tests — severity monotonic in its 4 inputs / invariant to the others; `required_capabilities ⊆ {motorized, medical_support}`; `0 ≤ priority_score ≤ 59` | `prolog/tests/test_rules.plt` (`rule_properties`, exhaustive sweep) · `priority.test.ts` (fixed grid + randomised) · `filtering.test.ts` ("§18.6 required-capabilities invariant", randomised) · `routing.test.ts` ("distances non-negative, symmetric, triangle inequality", randomised) |
| **18.7** Routing edge cases | see below |
| **18.8** Data-corruption / fail-safe | see below |

## 18.7 — routing edge cases

| Case | Test |
|---|---|
| `passable=false` on a shortest-path edge → exact next-shortest, not the blocked route, not an error | `routing.test.ts` "blocked shortest-path edge → exact next-shortest" (real triangle Mawlamyinegyun–Labutta–Myaungmya: 3 → 7) + "blocked Lemyethna→Yegyi edge → still reachable, just longer" |
| …end to end | `pipeline.integration.test.ts` "blocked Lemyethna→Yegyi edge: the worked example routes to the next-best unit (RB-05 @ 16), not an error" |
| A township whose candidates are all unavailable → fallback chain, not a crash | `filtering.test.ts` "§18.7: a township whose candidates are all unavailable" |
| Two candidates at equal shortest distance → deterministic tie-break | `filtering.test.ts` "selectUnit — tie-break" / "selectShelter" (co-located first, else lower id) |
| A newly-added 26th township on one bridge edge → Dijkstra still resolves | `routing.test.ts` "a newly-added 26th township on a single bridge edge still resolves" |

## 18.8 — data-corruption / fail-safe

| Case | Expected | Test |
|---|---|---|
| Negative / impossible `gauge_reading_cm` | 422, never a computed severity | `pipeline.integration.test.ts` "negative gauge_reading_cm -> 422" · `prolog/tests/test_server.plt` "negative gauge reading -> 422" |
| `township_id` not in the network | 422 | `pipeline.integration.test.ts` "unknown township_id -> 422" · `routing.test.ts` "returns null when the source township is not in the graph" |
| Gauge station absent / unresolvable (here: coastal township, no station) | 422 `incomplete_assessment`, not a silent skip | `pipeline.integration.test.ts` "coastal township, not breached -> 422 incomplete_assessment" |
| Prolog reachable but malformed / empty response | treated as unreachable → 503 | `prolog.test.ts` "maps a malformed 200 body to PrologUnavailableError" (client) → pipeline maps `PrologUnavailableError` → `ApiError("prolog_unavailable", 503)` |
| Prolog unreachable | 503, never a guessed severity | `prolog.test.ts` "maps a network failure to PrologUnavailableError" |

## Edge-case table (`08-Testing-QA-Plan.md` top) → tests

| Scenario | Test |
|---|---|
| No unit satisfies the full set → relax `medical_support`, flag it; else null + escalation | `filtering.test.ts` "fallback chain (doc 5 §9.1)" |
| No shelter satisfies capability + availability → relax capability first; else null + escalation | `filtering.test.ts` "fallback (doc 5 §9.2)" |
| Two candidates exactly equidistant → co-located first, else lower id | `filtering.test.ts` "tie-break" |
| `township_id` not in the graph → 422 | `pipeline.integration.test.ts` / `routing.test.ts` |
| A required fact missing → 422 incomplete_assessment, never a silent default | `prolog/tests/test_rules.plt` "non-breach with missing gauge data is unprovable" · `test_server.plt` 422 cases |
| Wrong/unverified gauge mapping → treat gauge severity as provisional, surface the % | `WhyTrace` component surfaces `gauge_percent` + the "own estimate, not official" caveat (18.4) |
| Coastal-tier township → runs the riverine rules, returns an answer, known named gap | `pipeline.integration.test.ts` "coastal township, breached -> 200 severe" (+ the not-breached 422 makes the gap explicit) |
| `breached` but gauge still below danger → severe via override | `pipeline.integration.test.ts` "breached but gauge still below the danger level -> still severe" |
| Two reports, same township, short window → not merged | `pipeline.integration.test.ts` "two reports for the same township are NOT merged" |
| Two concurrent cases want the same unit → first reservation wins | `pipeline.integration.test.ts` "concurrency (doc 8 §18.3)" |
| SWI-Prolog unreachable → 503 | `prolog.test.ts` |
| Case resolved twice / never assessed → no-op on resources, still transitions to resolved | `pipeline.integration.test.ts` "resolving twice is idempotent" + "resolving a never-dispatched case still moves it to resolved" |
