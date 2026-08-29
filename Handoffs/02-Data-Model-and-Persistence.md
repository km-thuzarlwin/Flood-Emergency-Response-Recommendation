# Data Model & Persistence Spec

Field names here are fixed identifiers used throughout every other document in this folder. Distilled from Sections 4–5 of the master specification.

## Architecture context

```
React (client)  --fetch-->  Next.js API Route (Node/TS)  --HTTP-->  SWI-Prolog HTTP server
     ^                              |    ^                                |
     +-------- JSON response -------+    +---------- JSON facts in, ------+
                                          JSON assessment out
                                     |
                                     v
                          PostgreSQL (Case, RescueUnit, Shelter,
                          GaugeStation, reservation state)
```

Prolog's only job: given facts about one township's current conditions, return severity, recommended action, and the required-capability set. All resource selection (unit, shelter, route) is TypeScript logic in the API route — see `05-API-and-Backend-Logic.md`.

The Leaflet map must be a client-only component (`'use client'`, SSR disabled for that piece) because Leaflet needs a real browser window and Next.js otherwise pre-renders on the server by default.

## Persistence: PostgreSQL

Case, RescueUnit, Shelter, GaugeStation, and reservation state persist in a relational store — PostgreSQL. This schema maps directly to tables with foreign keys (`Case.township_id → Township.id`, `Case.assigned_unit_id → RescueUnit.id`, and so on), and the atomic reservation requirement (see "Reservation" below) is naturally expressed as a single transactional `UPDATE`.

Fleet, shelter, and network reference data (Township, GaugeStation, NetworkEdge, RescueUnit, Shelter tables) can be seeded once and edited manually for this prototype — there is no live feed. But Case and reservation state must be real persisted rows, not in-memory server state: two concurrent API requests reading and writing the same RescueUnit row is exactly the concurrency scenario the reservation mechanism below depends on the database to arbitrate correctly.

**Reservation mechanics:** reservation happens atomically at the moment a unit/shelter is selected, before the API response is sent. Concretely, "atomically" means a single PostgreSQL transaction that reads the candidate RescueUnit/Shelter row, checks `status = available`, and writes `status = reserved` before any other request can interleave — the database's own row-locking is what arbitrates two simultaneous requests for the same unit, not application-level logic.

## Schema

### Township (network node)

| Field | Type | Notes |
|---|---|---|
| id | string (slug) | e.g. "yegyi" — used as the Prolog atom directly |
| display_name | string | e.g. "Yegyi" |
| district | string | e.g. Pathein, Hinthada, Ma-ubin, Pyapon, Labutta, Myaungmya, Kyonpyaw, Thayarwady |
| hazard_tier | enum | `riverine_upper \| riverine_central \| coastal_surge \| hub` — see `03-Regional-Network-and-Seed-Data.md` |
| gauge_station_id | GaugeStation.id, nullable | the DMH station this township's severity references |
| lat, lng | float, float | approximate real coordinates, for the Leaflet map only |
| is_base | boolean | true only for Yegyi — marks the pilot node in the UI, no logic depends on it |

### GaugeStation

| Field | Type | Notes |
|---|---|---|
| id | string | e.g. "hinthada_gauge" |
| river | string | e.g. "Ayeyarwady", "Ngawun", "Toe", "Pathein" |
| danger_level_cm | integer | real DMH datum — see `03-Regional-Network-and-Seed-Data.md` |
| source_note | string | "DMH daily water-level forecast, 26 June 2025" — a single dated snapshot, see `09-Assumptions-and-Provenance.md` |

### NetworkEdge

| Field | Type | Notes |
|---|---|---|
| from, to | Township.id, Township.id | undirected |
| distance | number | abstract relative-distance unit for **water-route** travel between townships — not kilometers, not road distance |
| passable | boolean | default true. Represents a water-route obstruction (e.g. a collapsed bridge span blocking a channel) — NOT road condition. Operator-maintained network data, same category as RescueUnit/Shelter status — set false when a specific segment is known to be out. Dijkstra automatically excludes any edge with `passable=false` and finds the next-shortest route with no separate logic needed. |

**Critical distinction, load-bearing for the API/routing logic in doc 5:** `road_status` (on Case, below) and `NetworkEdge.passable` are unrelated fields answering different questions. `road_status` is about ground conditions *at the reported township* and only ever affects which *kind* of boat is required (see doc 4, Section 7.3). `NetworkEdge.passable` is about whether a specific *route segment between two townships* is physically blocked, and is what actually feeds Dijkstra. Every RescueUnit in this network is a boat (see below) — do not let `road_status=impassable` block any NetworkEdge row; that would incorrectly ground the exact boats the system just required.

### Case (one flood report)

| Field | Type | Notes |
|---|---|---|
| case_id | string | format `FLD-YYYYMMDD-NNN` |
| township_id | Township.id | required |
| gauge_reading_cm | integer | current reading at the township's referenced gauge station |
| upstream_heavy_rain_days | integer 0–3+ | consecutive days of heavy rainfall in the upstream catchment — NOT read by severity, only by priority score (doc 5) |
| local_rainfall | enum | `light \| moderate \| heavy \| very_heavy` — secondary/flash-flood signal |
| embankment_status | enum | `intact \| breached` |
| terrain | enum | `low_lying \| elevated` |
| road_status | enum | `open \| impassable` — a ground-access signal at the reported township only; determines whether the responding RescueUnit must be motorized (doc 4, Section 7.3). Does NOT affect NetworkEdge.passable or routing. |
| vulnerable_present | boolean | |
| injured_survivors | boolean | |
| affected_population | integer | |
| reported_at | ISO 8601 timestamp | server-set |
| status | enum | `open \| assessed \| dispatched \| resolved \| cancelled` |
| severity | enum (assigned) | `low \| moderate \| high \| severe` |
| recommended_action | string (assigned) | |
| required_capabilities | array of enum (assigned) | subset of `{motorized, medical_support}` |
| priority_score | integer (assigned) | |
| priority_band | enum (assigned) | `low \| moderate \| high \| critical` |
| assigned_unit_id | RescueUnit.id, nullable | |
| assigned_shelter_id | Shelter.id, nullable | |

River condition is captured as `gauge_reading_cm`, a real number compared against the station's danger level — not a self-reported category.

### RescueUnit

**Every RescueUnit in this network is a rescue boat — there is no land-vehicle unit type in this version.** This is why `mobility` is `motorized | standard` rather than a vehicle-class enum: a motorized unit is an engine-powered boat, a standard unit is a non-motorized (paddle/oar) boat, and both travel the water routes identically. This fact is load-bearing for the routing logic in doc 4 (Section 7.5) and the capability rules in doc 4 (Section 7.3) — build it as boats, not generic vehicles.

| Field | Type | Notes |
|---|---|---|
| id | string | e.g. "RB-01" — RB = Rescue Boat |
| home_township_id | Township.id | |
| status | enum | `available \| reserved \| deployed` |
| mobility | enum | `motorized \| standard` |
| medical_support | boolean | **Definition:** true means a trained person — a medic, health worker, or MRCS-trained first-aider — is assigned to this unit. NOT "has a first-aid kit" (assumed present on every unit as a baseline, not modelled as a variable). |
| capacity | integer, nullable | not enforced by any rule in this version |

### Shelter

| Field | Type | Notes |
|---|---|---|
| id | string | e.g. "S-01" |
| display_name | string | |
| township_id | Township.id | |
| status | enum | `accepting \| full \| reserved_full` |
| capability | enum | `general \| medical_equipped` — **Definition:** stocked with medical supplies AND staffed by a health worker on-site, not merely a first-aid box in storage. |
| capacity | integer, nullable | not enforced by any rule in this version |

## Case lifecycle & resource reservation

| Entity | States | Meaning |
|---|---|---|
| Case.status | open → assessed → dispatched → resolved (or cancelled) | open: submitted. assessed: fully processed. dispatched: responder confirmed. resolved: closed, resources released. cancelled: false/duplicate/superseded. |
| RescueUnit.status | available → reserved → deployed → available | reserved on recommendation; deployed on dispatch confirmation; back to available on resolution. |
| Shelter.status | accepting → reserved_full → accepting | optional if capacity is not tracked numerically. |

Multi-township simultaneous flooding is the normal pattern for this region (a real embankment breach hit six townships at once) — this reservation model exists specifically to handle that correctly, not as a defensive nicety.
