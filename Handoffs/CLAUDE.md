# Flood Emergency Response Recommendation System (FERRS)

Flood-response decision-support prototype for the Ayeyarwady Delta, Myanmar. Read this file first — it is auto-loaded at the start of every session in this project directory. Everything else lives in this same folder and is linked below.

## What this is

A prototype tool that takes a structured report of flood conditions in one township, reasons about it with a **Prolog rule base** (severity, recommended action, required response capabilities — no ML, anywhere), separately scores urgency, and recommends the nearest suitable rescue boat and shelter from a simulated 25-township regional network — while explaining why. It is decision-support, not autonomous: a human responder makes the final call.

Full narrative background, real-world grounding, and every design rationale live in the master specification, **`Flood_ERRS_Full_Specification.docx`**, in the parent folder. The documents in this Handoffs folder are the working build set, distilled from that master spec for implementation — if anything here ever seems to conflict with the master spec, the master spec is the source of truth and the conflict should be logged (see Decision Log below) and flagged back to the project owner.

## Document index

| # | File | Covers |
|---|------|--------|
| 1 | `01-Requirements.md` | Purpose, objectives, goals, functional & non-functional requirements |
| 2 | `02-Data-Model-and-Persistence.md` | Full schema (Township, GaugeStation, NetworkEdge, Case, RescueUnit, Shelter) + PostgreSQL persistence |
| 3 | `03-Regional-Network-and-Seed-Data.md` | The 25 townships, 6 gauge stations, 26 network edges — actual seed data |
| 4 | `04-Prolog-Reasoning-Module.md` | The full `.pl` rule base: severity, action, required capabilities |
| 5 | `05-API-and-Backend-Logic.md` | Priority scoring, compound filtering, routing, reservation, full API contract |
| 6 | `06-Frontend-UI-Spec.md` | The 5 UI screens, Leaflet map notes, accessibility requirements |
| 7 | `07-Worked-Example-Acceptance-Test.md` | The real Lemyethna case, full trace, exact expected API response |
| 8 | `08-Testing-QA-Plan.md` | Full test plan + edge cases/failure modes |
| 9 | `09-Assumptions-and-Provenance.md` | Every flagged assumption, every data source, glossary |
| 10 | `10-Decision-Log.md` | Living log of judgment calls made during the build |
| 11 | `11-Future-Expansion.md` | Explicitly out of scope for this build — do not implement without being asked |

## Stack (decided, not up for reinterpretation)

Next.js (React client, Node.js/TypeScript API routes) · SWI-Prolog reasoning engine reached over HTTP · PostgreSQL for all persistent state. No Python. No machine learning anywhere in the reasoning path.

## Operating rules for whichever agent is building this

**When to just decide and keep going (log it in `10-Decision-Log.md`, don't stop):**
- Implementation-level choices the docs don't pin down: file/folder structure, which npm packages, ORM choice (as long as it satisfies the atomic-transaction requirement in doc 2/5), testing framework, code style, exact UI microcopy or colors beyond what doc 6 specifies.
- Filling a genuinely open gap where the docs already give enough to infer a correct, uncontroversial answer.

**When to stop and ask the project owner instead of deciding:**
- Anything that would resolve or override a flagged assumption in `09-Assumptions-and-Provenance.md` (e.g., the gauge-percent thresholds, the gauge-to-township mapping) — those are explicitly marked as needing external validation, not agent judgment.
- Anything that would pull scope in from `11-Future-Expansion.md` into the current build.
- Any change to a number, weight, or threshold that the specs state as a decided value (Section 7/8-equivalent tables in docs 4 and 5) — these were deliberately chosen and cross-checked against real data; don't adjust them to make a test pass.
- Anything that would change the stack itself (framework, language, database).
- Anything irreversible or expensive to undo.

Every decision, big or small, that involved a real judgment call gets a line in `10-Decision-Log.md` — the point isn't to avoid all autonomy, it's to make every autonomous call reviewable after the fact without needing to interrupt the build for each one.

## Build roadmap — phases with Definition of Done

Build order follows dependency order, not document order. Each phase gates the next; don't start a phase until the previous one's DoD is fully met.

**Phase 1 — Data & domain grounding** (from doc 2, doc 3)
Build: PostgreSQL schema migrated from doc 2's tables; doc 3's seed data loaded (25 townships, 6 gauge stations, 26 edges).
DoD: a query against each table returns exactly the row counts and values in doc 3 — 25 townships across the 4 tiers, 6 gauge stations with the exact `danger_level_cm` values listed, 26 edges reproducing doc 3's distances. No app code needed yet to pass this phase.

**Phase 2 — Prolog reasoning module** (from doc 4)
Build: the `.pl` file transcribed directly from doc 4, served over HTTP per doc 2's architecture diagram.
DoD: every test in doc 8 Section 18.1 and 18.6 (unit + property-based tests for the rule base) passes against the Prolog service directly, with no API layer involved yet.

**Phase 3 — API / backend logic** (from doc 5, depends on Phase 1 + 2)
Build: priority scoring, compound capability filtering, Dijkstra routing, reservation logic, and every endpoint in doc 5's API contract.
DoD: `07-Worked-Example-Acceptance-Test.md`'s Lemyethna case, submitted end-to-end through the real API, produces the exact response documented there — same `priority_score` (56), same assigned unit (`RB-01`), same assigned shelter (`S-03`), same exclusion notes. This is the single most important gate in the whole build.

**Phase 4 — Frontend** (from doc 6, depends on Phase 3)
Build: the 5 screens against the real API (not stubbed).
DoD: a non-technical reviewer can walk through Report → Results for the worked example and the recommendation and its explanation make sense to them (doc 8 Section 18.5).

**Phase 5 — QA hardening** (from doc 8, threaded throughout but finalized last)
DoD: every test category in doc 8 (18.1–18.8) passes, not just the ones each earlier phase's gate already required.

Phase 1 and Phase 2 can be built in parallel by different sessions/agents since neither depends on the other; Phase 3 needs both done first.
