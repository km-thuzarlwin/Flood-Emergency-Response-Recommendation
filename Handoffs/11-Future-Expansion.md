# Future Expansion (Out of Scope)

Everything in this document is explicitly **not** part of the current build. It exists so an agent doesn't wander into it uninvited, and so it doesn't get silently skipped without anyone knowing it was deliberately deferred. Do not implement anything here without being asked — if asked, log the decision to expand scope in `10-Decision-Log.md`. Distilled from Section 20 of the master specification.

## Hazard Regime 2 — Cyclone Storm Surge (the highest-value next build, already fully specified)

New Case facts: `cyclone_active` (boolean), `cyclone_track_distance_km` (number), `wind_speed_kmh` (number), `forecast_surge_height_m` (number), `month` (enum, since risk brackets April–May and October–November). A parallel `severity_surge/2` predicate, analogous in structure to `04-Prolog-Reasoning-Module.md` Section 7.1 but keyed to surge height and track proximity rather than gauge percentage, would apply only to the seven coastal-tier townships — a township's `hazard_tier` field is the natural switch between calling `severity/2` (riverine) or `severity_surge/2` (coastal) for a given report. Cyclone Nargis is the calibration benchmark for the top band of this model.

- Live rainfall/river-gauge and cyclone-track feed integration — DMH's own AIRBM decision-support system and GloFAS (Copernicus) are the real, already-existing systems this would integrate with rather than reinvent, replacing the manually-entered `gauge_reading_cm` with an automatically-populated one.
- Trend-based early-warning layer: compare consecutive `gauge_percent` readings per township over time, flagging a rapid rise as "trending toward severe" before a new report confirms it — still pure rule-based logic.
- SMS/USSD reporting channel for low-connectivity areas — feeding the same `POST /api/flood-case` pipeline, not a parallel system.
- Satellite/remote-sensing flood-extent cross-check via MIMU/UNDP Sentinel-1 maps and Copernicus EMS activations, as an independent input alongside the human-submitted report.

## AI/reasoning enhancements (still rule-based, not ML)

- Water-rescue crew certification as a third independent RescueUnit capability, using the same compound-filter pattern already built.
- Automatic edge-obstruction input — feed `NetworkEdge.passable` from a real source (a reported channel obstruction, a field observation, or the satellite cross-check above) instead of requiring an operator to update it by hand. The routing side already works — this is only about how the field gets set.
- Multi-hazard generalization beyond flood — the `required_capability` pattern and the whole pipeline are not flood-specific in structure.

## Resource & operations modeling

- Enforce RescueUnit.capacity and Shelter.capacity against affected_population, including multi-unit/multi-trip dispatch for a case the scale of the real Lemyethna event (39,000 affected) — the current version recommends exactly one unit and one shelter regardless of case size.
- Real intra-township micro-network replacing the illustrative last-mile distance.
- Real-time GPS tracking of units instead of a static home_township_id.
- A true priority-queue scheduler re-evaluating reservations across several open cases at once.

## Access & UX

- Myanmar-language (Burmese) UI — the primary users are local Myanmar responders.
- Offline-first / low-connectivity Progressive Web App mode.
- Short-window deduplication of near-simultaneous duplicate reports for the same township.
- Role-based authentication (coordinator vs. admin).

## Integration & deployment

- Direct integration with Myanmar Red Cross Society's existing coordination workflows.
- Data-sharing with AHA Centre / regional ASEAN disaster coordination systems and with DMH/AIRBM directly.
- An admin panel for updating fleet/shelter status and gauge readings directly (`/api/gauges` is a first step toward this).
- Audit logging and after-action reporting, feeding back into refining the flagged percentage-band assumptions using real outcomes over time.

## Validation & trust

- Field validation / usability testing with real MRCS township coordinators.
- Backtesting the severity logic against historical events already cited in this project — the 2015 benchmark flood, the 2024 season, and the real July 2026 Lemyethna breach — checking whether the rule-based classification would have matched what actually happened on the ground.
- Resolving the two flagged assumptions (gauge-to-township mapping, percentage-band cut-points) against authoritative DMH documentation, if and when it becomes available.
