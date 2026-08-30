# FERRS — Flood Emergency Response Recommendation System

A rule-based flood-response **decision-support** prototype for the Ayeyarwady Delta,
Myanmar. It takes a structured flood report for one township, reasons about it with a
**Prolog rule base** (severity, recommended action, required response capabilities —
no machine learning anywhere in the reasoning path), scores urgency separately, and
recommends the nearest *suitable* rescue boat and shelter from a simulated 25-township
regional network — while explaining why. A human responder makes the final call.

Course project (Sem 4, AI). The mandatory constraint is genuine rule-based AI — **no ML**.

## Repository layout

| Path | What it is |
|---|---|
| `Flood_ERRS_Full_Specification.docx` | The master specification — source of truth. |
| `Handoffs/` | The working build set distilled from the master spec. **Start with `Handoffs/CLAUDE.md`** (index + build roadmap). `10-Decision-Log.md` records every judgement call made during the build. |
| `supabase/migrations/` | PostgreSQL schema + seed data (Phase 1), applied to a hosted Supabase project. |
| `prolog/` | The SWI-Prolog reasoning module and its HTTP service (Phase 2). See `prolog/README.md`. |
| `web/` | The Next.js app — React client + API routes (Phases 3–4). See `web/AGENTS.md` (this is Next.js 16; consult the bundled docs). |

## Architecture

```
React (client) ──fetch──▶ Next.js API route (Node/TS) ──HTTP──▶ SWI-Prolog service
                               │         │
                               │         └── severity / action / required capabilities
                               ▼
                          PostgreSQL  (townships, gauges, network, fleet, shelters, cases + reservations)
```

Prolog's only job: given one township's current conditions, return severity, recommended
action, and the required-capability set. All resource selection (compound capability
filtering, Dijkstra routing, atomic reservation) is TypeScript in the API route.

## Stack

Next.js 16 (React 19, TypeScript) · SWI-Prolog (reasoning, over HTTP) · PostgreSQL
(hosted on Supabase) · postgres.js · Vitest. No Python. No ML.

## Build status

| Phase | Scope | State |
|---|---|---|
| 1 | DB schema + regional seed data (docs 2, 3) | ✅ done — migrations `001`–`004`, all DoD checks pass |
| 2 | Prolog rule base + HTTP service (doc 4) | ✅ done — `swipl prolog/run_tests.pl` → 41/41 |
| — | Next.js scaffold + DB / Prolog seams | ✅ ready |
| 3 | Priority scoring, filtering, routing, reservation, API (doc 5) — gated by the Lemyethna acceptance test (doc 7) | ✅ done — 10 API routes; the live acceptance test reproduces the doc-7 response exactly. |
| 4 | UI screens (doc 6) — Report, Results (+ "Why?" trace + Leaflet map), Regional Overview | ✅ done — `/report`, `/results/[id]`, `/overview`, `/`. Verified live in a mobile viewport. |
| 5 | QA hardening (doc 8) | ✅ done — every doc 8 category has tests. **41 Prolog + 52 web.** Coverage matrix in `web/TESTING.md`. |

## Running the pieces

### The whole app

```bash
cd web
cp .env.example .env      # fill in DATABASE_URL (Supabase) + FERRS_PROLOG_URL
npm install
npm run dev:all           # starts the Prolog service (:4321) AND Next dev (:3000)
```
Open http://localhost:3000. Two-terminal alternative: `npm run prolog` and `npm run dev`.

### Tests

```bash
swipl prolog/run_tests.pl        # Prolog rule base + HTTP service — 41 tests
cd web && npm test               # domain logic + live end-to-end — 52 tests
cd web && npm run test:integration   # just the live pipeline / acceptance suite
```
The live suite needs `web/.env` set and `npm run prolog` running; it skips itself otherwise.
Full coverage map: [web/TESTING.md](web/TESTING.md).

### Prolog service on its own

```bash
swipl prolog/serve.pl            # http://localhost:4321  (GET /health, POST /assess)
```

### Database

Schema and seed data live in `supabase/migrations/`, applied to the hosted Supabase
project. `web/.env`'s `DATABASE_URL` (the pooler connection string) is what the app
connects with at runtime.

## Data provenance

Real DMH gauge danger levels, real township flood-frequency tiering, and the real
July 2026 Lemyethna embankment breach ground the design. Everything the project
extrapolated rather than sourced (gauge-percentage bands, township→gauge mapping,
priority weights) is flagged in `Handoffs/09-Assumptions-and-Provenance.md` — treat
those as assumptions pending validation, not verified fact.
