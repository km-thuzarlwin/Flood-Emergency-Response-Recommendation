# FERRS — Prolog reasoning module (Phase 2)

Rule-based severity / action / capability reasoning for one township's flood report.
No machine learning anywhere (NFR-2) — this is the entire reasoning path.

## Files

| File | Role |
|---|---|
| `ferrs_rules.pl` | The rule base. §7.1 severity, §7.2 action, §7.3 capabilities transcribed **verbatim** from `../Handoffs/04-Prolog-Reasoning-Module.md`, plus `assess/2` orchestration. |
| `ferrs_server.pl` | HTTP wrapper (library only — does not self-start). Request validation + fail-safe error mapping. |
| `serve.pl` | Runnable launcher for `ferrs_server`. |
| `run_tests.pl` | Loads and runs both test files, exits 0/1. |
| `tests/test_rules.plt` | doc 8 §18.1 unit tests + §18.6 property tests. |
| `tests/test_server.plt` | Service-boundary tests: worked example over HTTP + every fail-safe path → 4xx. |

## Run the service

```
swipl prolog/serve.pl            # http://localhost:4321
swipl prolog/serve.pl 5000       # custom port
```
`serve.sh` / `serve.bat` wrap the same. Port also reads `FERRS_PROLOG_PORT`.
Bound to `localhost` only (no auth in this build — NFR-5).

## Run the tests

```
swipl prolog/run_tests.pl        # or test.sh / test.bat
```
Phase 2 DoD (CLAUDE.md): all of these pass with no API layer involved. Current: **41/41**.

## HTTP contract

### `GET /health`
```json
{ "status": "ok", "service": "ferrs-prolog", "ml_used": false }
```

### `POST /assess`

Request — the API route (Phase 3) supplies `danger_level_cm` by looking up the
township's gauge station in Postgres; Prolog keeps no copy of the DB.

```json
{
  "township_id": "lemyethna",
  "gauge_reading_cm": 1250,
  "danger_level_cm": 1160,
  "embankment_status": "breached",     // intact | breached
  "terrain": "low_lying",              // low_lying | elevated
  "local_rainfall": "heavy",           // light | moderate | heavy | very_heavy
  "road_status": "impassable",         // open | impassable
  "injured_survivors": true
}
```
`gauge_reading_cm` + `danger_level_cm` are optional **only** when
`embankment_status = breached` (the override needs no gauge).

Success `200`:
```json
{
  "township_id": "lemyethna",
  "severity": "severe",
  "severity_reason": "embankment_breach_override",   // or "gauge_derived"
  "gauge_percent": 108,                              // null if no gauge data
  "base_band": "high",                              // pre-override/modifier band; null if no gauge data
  "recommended_action": "Evacuate immediately",
  "required_capabilities": ["motorized", "medical_support"],
  "required_shelter_capabilities": ["medical_equipped"]
}
```

Fail-safe (NFR-1 / doc 8 §18.8) — never a guessed or partial result:

| Condition | Status | Body `error` |
|---|---|---|
| Body is not valid JSON | 400 | `malformed_json` |
| Missing / invalid required field, bad enum, negative gauge | 422 | `invalid_request` |
| Severity cannot be proven from the supplied facts | 422 | `incomplete_assessment` |

## Notes

- Input fact predicates are `thread_local`: each HTTP worker thread sees only its
  own request's facts, so the verbatim doc-4 rules (which consult global predicates)
  are concurrency-safe unmodified. (Decision logged in `../Handoffs/10-Decision-Log.md`.)
- `severity_reason` values: `embankment_breach_override` matches doc 5 §12.2 exactly;
  `gauge_derived` is this module's token for every non-override path (doc 6 §13.2 only
  requires distinguishing the two).
