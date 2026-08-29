# Assumptions, Flagged Data & Provenance

Every value the master specification invented or extrapolated, versus what's actually sourced. Distilled from Sections 16, 17, and 21 of the master specification. Treat everything in this document as data to respect, not data to silently correct — if you think one of these needs changing, log it (`10-Decision-Log.md`) and ask, per the policy in `CLAUDE.md`.

## System & scope assumptions (deliberate, not accidental gaps)

- Every rescue unit is assumed to carry basic first-aid supplies; only trained-person medical support is modelled.
- Fleet, shelter, and network status data are simulated/manually maintained, not a live feed.
- `NetworkEdge.passable` is operator-maintained, like RescueUnit/Shelter status — nothing in the current report pipeline sets it automatically. This is intentionally independent of `road_status` — see `04-Prolog-Reasoning-Module.md` Section 7.5.
- Passenger/boat capacity and shelter numeric capacity are optional fields, not enforced by any rule.
- Crew water-rescue certification is not modelled as its own capability.
- No deduplication of near-simultaneous duplicate reports.
- No authentication or role-based access control.
- Last-mile (intra-township) distances are illustrative, not computed from a real sub-township network.

## Data assumptions (flagged for validation)

- The `gauge_percent` bands (70% / 100% / 115%) are this project's own extrapolation, not DMH-published thresholds — DMH publishes only a single danger-level datum per station.
- The township-to-gauge-station mapping is this project's own geographic inference, not stated explicitly in any source reviewed so far.
- Cyclone storm-surge hazard (the dominant real risk for seven of this network's 25 townships) is not modeled in this version at all.
- DMH's published danger levels come from a single dated forecast table (26 June 2025); DMH does not publish separate delta-station "warning level" datums distinct from the danger level itself.
- Population and exposure figures rely on the 2014 census and 2023 projections; recent displacement and conflict have shifted actual distributions, and some 2026 figures cited come from advocacy/opposition-aligned outlets — directionally consistent with other sources but not independently verified.
- Since the 2021 coup, official Myanmar disaster data is fragmented and contested between government and opposition sources; pre-2021 historical baselines (e.g., the 2015 flood) are more reliable than some very recent official counts.
- The population-tier point values in `05-API-and-Backend-Logic.md` (0/2/4/6/8) and every other priority weight are this project's own structure, not empirically validated.

## Data sources

| Used for | Source |
|---|---|
| Real-world precedent for the overall architecture | IRIS-AI (Unblur) — deployed across 6 UK fire departments, Springer 2025 |
| What deployed flood systems do NOT yet do (forecast/alert vs. recommend) | Google Flood Hub; Flash Flood Guidance System (Lower Mekong Basin, WMO/NOAA/HRC) |
| Township-level flood-frequency tiering, satellite-verified | Seeger et al., International Journal of Disaster Risk Reduction 114:104723, 2024 (Sentinel imagery, 2015–2023) |
| Sea-level-rise / permanent-inundation vulnerability by district | Seeger et al., Hydrology and Earth System Sciences (HESS), 2023 |
| DMH river-gauge danger levels (6 stations) | Department of Meteorology and Hydrology daily water-level forecast, 26 June 2025 |
| Region-specific flood-depth severity bands (candidate for further refining Section 7.1) | Flood hazard mapping and assessment in data-scarce Nyaungdon area, Myanmar — PLOS ONE |
| Township flood-frequency risk-index bands (secondary threshold source) | Operational Flood Risk Index Mapping for Disaster Risk Reduction... Myanmar — Frontiers in Environmental Science |
| Real, precise detail of the July 2026 Ngawun/Lemyethna embankment breach | Compass artifact compilation (teammate-supplied), citing on-the-ground and township-level reporting |
| 2015 benchmark flood (9M affected, 1.7M displaced, 125 killed per NNDMC) | IFRC / Myanmar Red Cross Society report, Jan 2016; Copernicus EMS activation EMSR130 |
| 2012 and 2024 recurrent flood events | AP wire reporting (2012); MIMU/UNDP satellite flood-extent maps, World Bank flood-extent note (2024) |
| Cyclone Nargis (2008) casualty and surge data — Hazard Regime 2 benchmark | Post-Nargis Joint Assessment (official); Fritz et al., Nature Geoscience, 2009 (independent estimate) |
| Cyclone Mocha (2023) — cross-regional cyclone effect example | Public reporting on the May 2023 Rakhine landfall and its limited Ayeyarwady impact |
| Existing real early-warning infrastructure | World Bank Ayeyarwady Integrated River Basin Management (AIRBM) Project, P146482, US$100.0M IDA credit, approved 9 Dec 2014; GloFAS (Copernicus), which treats Zalun as the basin outlet |
| Population and exposure figures | 2023 UNFPA regional population estimate; 2014 census baseline |
| Structural template for tiered public warning thresholds (not Myanmar data itself) | PAGASA (Philippines) color-coded rainfall warning system |
| Target-user grounding | MRCS/IFRC public reporting on Yegyi Township flood response, August 2026 |

**On the source compilation's own caveats:** some 2026 figures come from advocacy/opposition-aligned outlets (DVB, ISP-Myanmar, MoeMaKa) and NUG sources — directionally consistent but not independently verified; Grokipedia was used only for uncontroversial geographic context and should be treated cautiously as AI-generated encyclopedia content; and academic flood-frequency percentages reflect area flooded, not necessarily populated area flooded, since much exposed area is sparsely populated. These caveats are inherited wherever this project draws on that compilation.

## Glossary

| Term | Meaning |
|---|---|
| Severity | Prolog's assessment of case severity: low / moderate / high / severe |
| Gauge percent | gauge_reading_cm as a percentage of the referenced station's DMH danger level |
| Embankment override | The rule that a breached embankment forces severity=severe regardless of every other input |
| Hazard Regime 1 / 2 | Riverine-monsoon (built) vs. cyclone storm-surge (specified, not built) |
| Required capability | A resource attribute a case's rescue unit MUST have — a set, not a single value |
| Compound filtering | Requiring a candidate to satisfy every entry in a required-capability set at once |
| Priority score / band | Separately-computed urgency ranking (0–59, banded), distinct from severity |
| Last-mile distance | Illustrative intra-township distance, as opposed to inter-township network distance |
| Reservation | The state change marking a recommended unit/shelter unavailable to other cases until resolution |
| Medical support (unit) | A trained person able to give medical care is assigned to that unit — not merely a first-aid kit |
| Medical-equipped (shelter) | Stocked with medical supplies AND staffed by a health worker on-site |
| Base township | Yegyi — the pilot node used throughout the worked examples; not privileged by any rule logic |
| Network / graph | The 25-township, 26-edge model of the Ayeyarwady Delta used for shortest-path routing |
| Flagged assumption | A value this document derived itself rather than found in a cited source |
