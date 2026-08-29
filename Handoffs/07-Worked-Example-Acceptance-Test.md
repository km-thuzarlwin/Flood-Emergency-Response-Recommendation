# Worked Example & Acceptance Test

This is the canonical end-to-end regression test for the entire system — every module's Definition of Done in `CLAUDE.md` refers back to this document. Distilled from Section 14 of the master specification, using the real July 2026 Lemyethna embankment breach with its real, documented numbers.

## Seed data for this test

### Rescue units

| ID | Status | Location | Mobility | Medical Support |
|---|---|---|---|---|
| RB-01 | available | Yegyi | motorized | true |
| RB-02 | available | Lemyethna | motorized | false |
| RB-03 | deployed | Pathein | motorized | true |
| RB-04 | available | Myaungmya | standard | false |
| RB-05 | available | Bogale | motorized | true |

### Shelters

| ID | Status | Capability | Location |
|---|---|---|---|
| S-01 — Yegyi High School | full | general | Yegyi |
| S-02 — Lemyethna Monastery | accepting | general | Lemyethna |
| S-03 — Pathein General Hospital Annex | accepting | medical_equipped | Pathein |
| S-04 — Myaungmya Community Hall | accepting | general | Myaungmya |

## Incoming report

Township: Lemyethna. `gauge_reading_cm=1250` (against the Ngathaingchaung station's 1160 cm danger level), `upstream_heavy_rain_days=3`, `local_rainfall=heavy`, `embankment_status=breached`, `terrain=low_lying`, `road_status=impassable`, `vulnerable_present=true`, `injured_survivors=true`, `affected_population=39000` — the real documented figure for Lemyethna Township alone.

This exact request body is in `05-API-and-Backend-Logic.md` under "POST /api/flood-case — request body."

## Step-by-step trace (every module must reproduce this exactly)

1. **Severity (doc 4, Section 7.1):** `gauge_percent = round(100 × 1250 / 1160) = 108%` → `base_band = high`. `embankment_status=breached` fires first and overrides everything: `severity = severe` (`severity_reason = embankment_breach_override`).
2. **Action (doc 4, Section 7.2):** `severity=severe` → "Evacuate immediately".
3. **Required capabilities (doc 4, Section 7.3):** `road_status=impassable` → motorized required. `severity=severe` → motorized required (redundant, same conclusion). `injured_survivors=true` → medical_support required. `required_capabilities = { motorized, medical_support }`.
4. **Priority score (doc 5):** embankment +12, gauge high-band +8, upstream rain (3 days) +4, local rainfall heavy +5, road impassable +6, vulnerable +7, injured +6, population 10,000+ tier +8 = **56** → `priority_band = critical`.
5. **Unit filtering (doc 5, Compound Capability Filtering):** RB-02 is stationed AT Lemyethna (distance 0) — the closest possible unit — but is excluded: no medic aboard. RB-01 (Yegyi, motorized, medical) is a candidate. RB-03 excluded (deployed). RB-04 excluded (standard, no medic). RB-05 (Bogale) a distant candidate.
6. **Routing (doc 5, Shortest-Path Routing):** `distance(Lemyethna→Yegyi) = 3` for RB-01. `distance(Lemyethna→Bogale) = Lemyethna-Ngathaingchaung(3)+Thabaung(3)+Pathein(3)+Mawlamyinegyun(4)+Bogale(3) = 16` for RB-05. **RB-01 wins despite RB-02 being physically closer, because RB-02 fails the compound filter first.**
7. **Shelter selection:** `required_shelter_capability = medical_equipped`. S-02 Lemyethna Monastery is distance 0 but general, not medical_equipped — excluded despite being the closest. S-01 excluded (full). S-04 excluded (general). S-03 Pathein is the only candidate: `distance(Lemyethna→Pathein) = Ngathaingchaung(3)+Thabaung(3)+Pathein(3) = 9`.
8. **Reservation (doc 2):** RB-01 and S-03 both flip to `reserved` atomically with the response.

## Why this example matters

The single closest unit AND the single closest shelter are both wrong choices once their missing medical capability is accounted for — the clearest possible demonstration of why compound filtering exists, using real casualty-scale numbers rather than an invented population figure. If an implementation of this system would select RB-02 or S-02 for this case, something in the compound filter is broken.

## Expected final response

Must match `05-API-and-Backend-Logic.md`'s "Success response (200)" example exactly: `case_id: "FLD-20260731-001"`, `severity: "severe"`, `priority_score: 56`, `priority_band: "critical"`, `assigned_unit.id: "RB-01"`, `assigned_shelter.id: "S-03"`.
