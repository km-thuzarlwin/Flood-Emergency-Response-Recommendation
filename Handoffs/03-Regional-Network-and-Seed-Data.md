# Regional Network & Domain Seed Data

The actual data to load against the schema in `02-Data-Model-and-Persistence.md`. Distilled from Section 6 of the master specification.

The network spans the 25 townships that satellite-verified flood-frequency tiering identifies as the region's priority set — 18 in the riverine hazard zone this system models now, plus 7 coastal townships carried as network nodes (for shelter/logistics purposes) but explicitly not yet modeled for their dominant hazard, cyclone storm surge (see `04-Prolog-Reasoning-Module.md` Section 7.6 and `11-Future-Expansion.md`).

## Township list by tier

| Tier | Townships | Basis |
|---|---|---|
| Riverine — upper (Ayeyarwady mainstem) | Hinthada, Zalun, Myanaung, Kyangin, Ingapu | Flood almost every year; Hinthada floods twice, sometimes three times a year, water exceeding danger level by ~2.13 m for 15–16 days |
| Riverine — Ngawun River corridor | Lemyethna, Ngathaingchaung, Thabaung, Yegyi, Kyonpyaw, Kyaunggon, Kangyidaunt | Site of the July 2026 embankment breach and its documented flood path; includes the project's base township, Yegyi |
| Riverine — delta central (Toe River / Ma-ubin district) | Maubin, Pantanaw, Nyaungdon, Danubyu | Named among the worst-hit townships in the region for cropland/asset exposure |
| Coastal — cyclone storm-surge zone (network nodes only; hazard not yet modeled) | Labutta, Bogale, Mawlamyinegyun, Pyapon, Dedaye, Kyaiklat, Ngapudaw, Myaungmya | Catastrophic under storm surge but comparatively low pure-monsoon riverine frequency; also most sea-level-rise-vulnerable |
| Hub | Pathein | Region capital; own DMH gauge; highest documented monsoon flood frequency of any single station; logistics link between the Ngawun corridor and the coastal tier |

## Gauge stations (GaugeStation records)

| Station | River | Danger level | Townships referencing this station |
|---|---|---|---|
| Hinthada | Ayeyarwady | 1342 cm (~44.0 ft) | Hinthada |
| Zalun | Ayeyarwady | 1160 cm (~38.1 ft) | Zalun, Myanaung, Kyangin, Ingapu |
| Ngathaingchaung | Ngawun | 1160 cm (~38.1 ft) | Ngathaingchaung, Lemyethna, Yegyi, Kyonpyaw |
| Thabaung | Ngawun | 620 cm (~20.3 ft) | Thabaung, Kyaunggon, Kangyidaunt |
| Maubin | Toe | 720 cm (~23.6 ft) | Maubin, Pantanaw, Nyaungdon, Danubyu |
| Pathein | Pathein/Ngawun | 350 cm (~11.5 ft) | Pathein |

**Flagged assumption:** the six danger levels themselves are real, sourced DMH data (26 June 2025 forecast table). The mapping of which non-gauge township references which station is this project's own reasonable geographic inference (by river course and district), not stated explicitly in any source reviewed — verify against DMH's actual station-assignment convention before relying on it operationally. See `09-Assumptions-and-Provenance.md`.

## Edge table (canonical — build this directly; the diagram below is a visual aid only)

| Township A | Township B | Distance |
|---|---|---|
| Hinthada | Zalun | 3 |
| Zalun | Myanaung | 3 |
| Myanaung | Kyangin | 3 |
| Zalun | Ingapu | 3 |
| Hinthada | Lemyethna | 4 |
| Lemyethna | Ngathaingchaung | 3 |
| Ngathaingchaung | Thabaung | 3 |
| Lemyethna | Yegyi | 3 |
| Yegyi | Kyonpyaw | 2 |
| Kyonpyaw | Kyaunggon | 2 |
| Kyonpyaw | Kangyidaunt | 3 |
| Thabaung | Pathein | 3 |
| Kyonpyaw | Nyaungdon | 3 |
| Nyaungdon | Maubin | 2 |
| Maubin | Pantanaw | 2 |
| Maubin | Danubyu | 3 |
| Pathein | Ngapudaw | 3 |
| Pathein | Mawlamyinegyun | 4 |
| Mawlamyinegyun | Labutta | 3 |
| Mawlamyinegyun | Bogale | 3 |
| Mawlamyinegyun | Myaungmya | 3 |
| Myaungmya | Labutta | 4 |
| Bogale | Pyapon | 3 |
| Pyapon | Dedaye | 2 |
| Pyapon | Kyaiklat | 3 |
| Pantanaw | Dedaye | 4 |

26 edges across 25 nodes — every node reachable from every other. Four bridge edges connect the four clusters: Hinthada–Lemyethna (mainstem ↔ Ngawun corridor), Kyonpyaw–Nyaungdon (Ngawun corridor ↔ delta-central), Thabaung–Pathein (Ngawun corridor ↔ coastal hub), Pantanaw–Dedaye (delta-central ↔ coastal). Adding a 26th township only requires new edge rows — nothing else in the system needs to change.

```
Ingapu   Kyangin
   \      /
   Zalun--Myanaung        Kangyidaunt   Kyaunggon
     |                        \           /
  Hinthada                    Kyonpyaw--Yegyi--Lemyethna
                                 |                |
                             Nyaungdon      Ngathaingchaung
                              /    \               |
                          Maubin   Danubyu       Thabaung
                            |                        |
                        Pantanaw               Pathein--Ngapudaw
                            \                  /
                            Dedaye        Mawlamyinegyun
                               \           /   |     \
                              Pyapon    Labutta  Myaungmya
                               /
                           Bogale   (Mawlamyinegyun--Bogale also connects)
                                                Kyaiklat--Pyapon
```
