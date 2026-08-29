# API & Backend Logic Spec

Runs in the Next.js API route (TypeScript), calling the Prolog service from `04-Prolog-Reasoning-Module.md` and the database from `02-Data-Model-and-Persistence.md`. Distilled from Sections 8–12 of the master specification.

## Priority Scoring

Runs in parallel with the Prolog call — independent of severity, not derived from it.

| Factor | Points | Condition |
|---|---|---|
| Embankment breached | +12 | `embankment_status = breached` — highest single factor |
| Gauge band | +3 / +8 / +10 | moderate / high / severe, from `gauge_percent` band (scored independently of severity, so a severe-via-embankment case still records how bad the river itself also is) |
| Upstream heavy rain ≥3 days | +4 | early-warning signal |
| Local rainfall | +0 / +3 / +5 / +6 | light / moderate / heavy / very_heavy |
| Road impassable | +6 | |
| Vulnerable group present | +7 | |
| Injured survivors | +6 | |
| Affected population | +0 / +2 / +4 / +6 / +8 | 0–99 / 100–499 / 500–1,999 / 2,000–9,999 / 10,000+ — tiered so a 39,000-person case scores differently from a 150-person one |

**Flagged assumption:** the population tiers and every weight above are this project's own structure, not derived from any source — see `09-Assumptions-and-Provenance.md`. Do not silently retune these; if you think they need changing, log it (`10-Decision-Log.md`) and ask.

Maximum possible score: 12 + 10 + 4 + 6 + 6 + 7 + 6 + 8 = **59**.

```
0–10   -> LOW
11–25  -> MODERATE
26–40  -> HIGH
41+    -> CRITICAL
```

**Tie-breaking across multiple open cases:** (1) higher raw `priority_score`, (2) higher Prolog severity, (3) earlier `reported_at`.

## Compound Capability Filtering

A candidate must satisfy every entry in `required_capabilities`, not just one. This is the system's central design pattern.

```javascript
function isCandidate(unit, requiredCapabilities) {
  if (unit.status !== 'available') return false;
  for (const cap of requiredCapabilities) {
    if (cap === 'motorized' && unit.mobility !== 'motorized') return false;
    if (cap === 'medical_support' && unit.medical_support !== true) return false;
  }
  return true;
}
```

**Fallback when no unit satisfies every requirement:**
1. Try the full required-capability set.
2. If no candidate, drop `medical_support` (keep `motorized` if required) and retry — flag: "No unit with medical support was available; arrange a medic to meet the case, or coordinate a second unit."
3. If still none, return `assigned_unit_id = null`, case stays open, flag: "No suitable rescue unit available in the network — escalate for manual coordination."

**Fallback for shelters:** same pattern — capability relaxed before availability; if none accepting anywhere in the network, null assignment with escalation flag.

## Shortest-Path Routing

**Two distance scales — do not conflate them:**
- Inter-township distance — the `NetworkEdge` values in `03-Regional-Network-and-Seed-Data.md`, abstract relative units, feeds Dijkstra.
- Intra-township ("last-mile") distance — a small illustrative per-unit figure for dashboard realism, NOT computed by Dijkstra (see `11-Future-Expansion.md` for replacing this with a real sub-township network).

**Algorithm:**
1. Run Dijkstra from the incident's township over the full NetworkEdge graph.
2. Restrict to units/shelters that passed the compound filter above.
3. `distance-to-incident = shortest-distance(candidate.township, incident.township)`; 0 if co-located.
4. Pick the lowest distance-to-incident.
5. Tie-break: prefer a candidate already at the incident's township, else lower ID alphabetically.

**No-route case:** if a township is missing from the graph, this is a validation error (see API errors below), not a silent empty result — with the network now covering 25 real townships, this should only occur on a genuine data-entry mistake.

## Case Lifecycle & Resource Reservation

See `02-Data-Model-and-Persistence.md` for the full state table and the atomic-transaction mechanics. Reservation happens at the end of the filtering + routing steps above, before the API response is sent.

## API Contract

| Endpoint | Method | Purpose |
|---|---|---|
| /api/flood-case | POST | Submit a new report, run the full pipeline, return the recommendation. |
| /api/flood-case/:id | GET | Retrieve current case state. |
| /api/flood-case/:id/dispatch | POST | Mark status='dispatched'. |
| /api/flood-case/:id/resolve | POST | Mark status='resolved', release reservations. |
| /api/flood-case/:id/cancel | POST | Mark status='cancelled', release reservations. |
| /api/cases | GET | List all cases — backs the regional overview screen. |
| /api/townships | GET | List Township nodes and their hazard_tier/gauge_station_id. |
| /api/gauges | GET | List GaugeStation records and current readings. |
| /api/units | GET | |
| /api/shelters | GET | |

### POST /api/flood-case — request body

```json
{
  "township_id": "lemyethna",
  "gauge_reading_cm": 1250,
  "upstream_heavy_rain_days": 3,
  "local_rainfall": "heavy",
  "embankment_status": "breached",
  "terrain": "low_lying",
  "road_status": "impassable",
  "vulnerable_present": true,
  "injured_survivors": true,
  "affected_population": 39000
}
```

### Success response (200)

See `07-Worked-Example-Acceptance-Test.md` for the full trace behind these numbers — this exact JSON is the acceptance target.

```json
{
  "case_id": "FLD-20260731-001",
  "township_id": "lemyethna",
  "status": "assessed",
  "severity": "severe",
  "severity_reason": "embankment_breach_override",
  "recommended_action": "Evacuate immediately",
  "required_capabilities": ["motorized", "medical_support"],
  "priority_score": 56,
  "priority_band": "critical",
  "assigned_unit": { "id": "RB-01", "home_township_id": "yegyi", "distance_to_incident": 3 },
  "assigned_shelter": { "id": "S-03", "display_name": "Pathein General Hospital Annex",
                        "distance_to_incident": 9 },
  "notes": [
    "RB-02, stationed AT Lemyethna, was excluded — no medic aboard",
    "Lemyethna Monastery (nearest shelter, distance 0) lacks medical capability for this case"
  ]
}
```

### Error / edge responses

| Condition | HTTP status |
|---|---|
| Missing/invalid field, unknown township_id | 422 |
| Prolog query fails to prove severity | 422 |
| No unit/shelter satisfies requirements after fallback | 200, with null assignment + escalation note |
| SWI-Prolog server unreachable | 503 |

Never return a guessed or partial result on any of the above — see `01-Requirements.md` NFR-1.
