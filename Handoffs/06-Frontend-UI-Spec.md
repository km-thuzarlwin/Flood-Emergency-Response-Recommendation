# Frontend / UI Spec

Distilled from Section 13 of the master specification. Built against the real API contract in `05-API-and-Backend-Logic.md` — not stubbed, per the Phase 4 gate in `CLAUDE.md`.

## Screen: Report Flood Situation (form)

Field set matches the Case schema in `02-Data-Model-and-Persistence.md`: township, gauge reading (cm — or, more realistically for a non-technical responder, a simple "above/at/below the danger mark" choice that the client converts to an approximate cm value; see `11-Future-Expansion.md` for replacing this with a live feed entirely), upstream heavy-rain days, local rainfall, embankment status, terrain, road status, vulnerable groups, injuries, affected population.

## Screen: Results Dashboard

Shows severity, recommended_action, the assigned unit and shelter with their distances, and `severity_reason` so a responder can see at a glance whether a severe rating came from the gauge or from an embankment override — this distinction matters operationally, since an embankment breach can be addressed (temporary repair, sandbagging) in a way a rising river cannot.

## Screen: Regional Overview

Lists all open/assessed/dispatched cases with the regional map, color-coded by severity.

## Explainability element

A "Why?" trace states which gauge station was referenced and the computed `gauge_percent`, not just the final band — given the percentage bands are this project's own extrapolated assumption rather than official DMH thresholds (`09-Assumptions-and-Provenance.md`), showing the raw percentage lets a responder sanity-check the classification themselves.

## Accessibility & field-use considerations

- Categorical fields (embankment status, terrain, road status, local rainfall) are dropdowns or toggles, not free text, to minimize data-entry errors under field stress.
- Layout targets a mid-range Android phone browser at outdoor brightness — large tap targets, and severity colors chosen to stay distinguishable in direct sunlight.
- Form and results language is kept plain and non-technical throughout, consistent with the primary user in `01-Requirements.md`.
- Burmese-language UI and offline/low-connectivity support are named future work, NOT built in this version — see `11-Future-Expansion.md`. Do not add them without being asked.

## Visual direction — map design per screen

The map's information architecture differs by screen, following directly from the two different users named in `01-Requirements.md`. This is a decided design direction, not a full visual spec — exact colors, iconography, and pixel layout remain open implementation choices under `CLAUDE.md`'s operating rules.

- **Report → Results** (the primary user, on a mid-range Android phone outdoors — see Accessibility above): the map stays minimal and high-contrast — a light basemap, three labeled pins (incident, assigned unit's home township, assigned shelter), and a single bold route line for the chosen path. Nothing else is overlaid. Severity is read off the colored badge on the Results card itself, not decoded from the map.
- **Regional Overview** (the secondary/admin user monitoring several cases at once, more plausibly on a larger screen): the map may carry more information density — multiple case pins color-coded by severity, alongside the fleet/case list panel — but should stay high-contrast rather than adopting a dark, low-contrast theme, both because nothing about this user's task requires it and because the outdoor sunlight-legibility requirement above should hold if any component here is ever reused on a phone.

## Map component

The Leaflet map must be a client-only component (`'use client'`, SSR disabled for that piece) because Leaflet needs a real browser window and Next.js otherwise pre-renders on the server by default — see `02-Data-Model-and-Persistence.md`.

## Acceptance

Definition of Done for this module: a non-technical reviewer can walk through Report → Results for the worked example in `07-Worked-Example-Acceptance-Test.md` and the recommendation and its explanation make sense to them, per `08-Testing-QA-Plan.md` Section 18.5.
