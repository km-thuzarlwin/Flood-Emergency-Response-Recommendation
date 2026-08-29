# Prolog Reasoning Module Spec

Authoritative logic — this should transcribe directly into a `.pl` file with no design decisions left to make. Distilled from Section 7 of the master specification. Served over HTTP per the architecture in `02-Data-Model-and-Persistence.md`.

## 7.1 Severity — gauge percentage of danger level

Step 1: compute `gauge_percent = round(100 * gauge_reading_cm / danger_level_cm)` using the township's referenced station.
Step 2: map to a base band.

| gauge_percent | Base severity band |
|---|---|
| < 70% | low |
| 70% – 99% | moderate |
| 100% – 114% | high |
| ≥ 115% | severe |

**Flagged assumption:** DMH publishes only a single danger-level datum per station, not intermediate watch/warning thresholds. The 70% / 100% / 115% cut-points above are this project's own reasonable extrapolation, not DMH-published values. See `09-Assumptions-and-Provenance.md`. Do not treat these as more authoritative than they are; do not silently tune them.

Step 3 — terrain modifier: if `terrain = low_lying`, raise the base band by one level (low→moderate→high→severe, capped at severe); `elevated` leaves it unmodified.

Step 4 — local rainfall floor: if `local_rainfall = very_heavy`, the result is never lower than moderate, regardless of gauge_percent.

Step 5 — embankment override (highest-priority rule): if `embankment_status = breached`, severity = severe unconditionally, regardless of every other input. Deliberately not merged into the gauge table — a breach can flood a township even where the gauge reading itself has not yet crossed its danger level. This is the single most important rule in the system; it is grounded in a real event (see master spec Section 2/14).

```prolog
gauge_percent(Township, Percent) :-
    township_gauge_reading(Township, Reading),
    township_gauge_station(Township, Station),
    gauge_danger_level(Station, Danger),
    Percent is round(100 * Reading / Danger).

base_band(Percent, low)     :- Percent < 70.
base_band(Percent, moderate):- Percent >= 70,  Percent < 100.
base_band(Percent, high)    :- Percent >= 100, Percent < 115.
base_band(Percent, severe)  :- Percent >= 115.

raise(low, moderate). raise(moderate, high). raise(high, severe). raise(severe, severe).
at_least(Band, moderate, moderate) :- member(Band, [low]).
at_least(Band, moderate, Band)     :- \+ member(Band, [low]).

severity(Township, severe) :- embankment_status(Township, breached), !.
severity(Township, Severity) :-
    gauge_percent(Township, Percent),
    base_band(Percent, Base0),
    ( terrain(Township, low_lying) -> raise(Base0, Base1) ; Base1 = Base0 ),
    ( local_rainfall(Township, very_heavy) -> at_least(Base1, moderate, Severity) ; Severity = Base1 ).
```

**Severity is driven by exactly these four inputs and no others:** `gauge_reading_cm` (via `gauge_percent`), `embankment_status`, `terrain`, `local_rainfall`. This matters for testing (see `08-Testing-QA-Plan.md` Section 18.6) — `road_status`, `injured_survivors`, `vulnerable_present`, `upstream_heavy_rain_days`, and `affected_population` correctly do NOT affect severity; they affect required capabilities or priority score only.

## 7.2 Recommended action — deterministic from severity

| Severity | Recommended action |
|---|---|
| severe | Evacuate immediately |
| high | Prepare to evacuate — evacuate vulnerable groups first, stage resources |
| moderate | Heightened monitoring — increase reporting frequency, alert on-call responder |
| low | Routine monitoring |

## 7.3 Required capabilities

```prolog
required_capability(Township, motorized) :- road_status(Township, impassable).
required_capability(Township, motorized) :- severity(Township, severe).
required_capability(Township, medical_support) :- injured_survivors(Township, yes).
required_capabilities(Township, Set) :-
    findall(C, required_capability(Township, C), List), list_to_set(List, Set).

required_shelter_capability(Township, medical_equipped) :- injured_survivors(Township, yes).
```

An embankment breach reliably implies severe (7.1) which already implies motorized (7.3) — no separate embankment→motorized rule is needed.

## 7.4 Upstream heavy rain — early-warning signal, not a severity input

`upstream_heavy_rain_days` is deliberately NOT wired into the severity rules above — 3+ days of upstream heavy rain is a leading indicator that `gauge_reading_cm` is about to rise, not evidence that it already has. It is used only in the priority score (`05-API-and-Backend-Logic.md`).

## 7.5 Road/edge impassability — by design, read this before touching routing

`road_status` deliberately does NOT mark `NetworkEdge` rows impassable for Dijkstra — this is by design, not an oversight. Every RescueUnit in this network is a boat (`02-Data-Model-and-Persistence.md`) — mobility is `motorized | standard`, there is no land-vehicle unit type — so the NetworkEdge graph represents water-route travel between townships, not road travel. `road_status=impassable` is a ground-access signal that determines whether the responding boat needs an engine (7.3) — it says nothing about whether the water route itself is open. Treating it as a routing block would be backwards for this domain: the flooding that makes roads impassable is typically why a boat response is needed in the first place, not a reason a boat can't get there.

`NetworkEdge.passable` (see `02-Data-Model-and-Persistence.md`) exists for the genuine version of this problem — a specific water-route obstruction, such as a collapsed bridge span or a segment worse-flooded than the reported incident itself. It is operator-maintained network data; no field in the current Case report sets it automatically. Once it is set false for a segment, no special rerouting logic is needed: Dijkstra already computes over only the passable edges and returns the next-shortest available route on its own (see `05-API-and-Backend-Logic.md` Section 10.2). The open gap is upstream of Dijkstra, not in it — nothing yet feeds this field from a live report; see `11-Future-Expansion.md`.

## 7.6 Hazard Regime 2 — cyclone storm surge (NOT implemented in this version)

The seven coastal townships (see `03-Regional-Network-and-Seed-Data.md`) face a different dominant hazard — cyclone storm surge, not river-gauge exceedance — driven by cyclone track, wind speed, and surge height, none of which exist in the current Case schema. A report submitted for one of these townships using today's schema will still run through 7.1–7.3 and produce an answer, but that answer does not capture their real primary risk. This is a known, named gap — do not build the surge model without being asked; see `11-Future-Expansion.md` Section 20.1 for the fully-specified future module (new facts, a parallel `severity_surge/2` predicate).
