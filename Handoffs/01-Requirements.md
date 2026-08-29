# Requirements — Purpose, Goals & FR/NFR

Distilled from Sections 1–3 of the master specification. See `CLAUDE.md` for the document index.

## Purpose

A prototype flood-response decision-support tool for the Ayeyarwady Delta, Myanmar, specified as a real system design — every data structure, rule, and algorithm is meant to be implementable as stated. It takes a structured report of flood conditions in one township, reasons about it with a Prolog rule base, scores urgency separately, and recommends the nearest suitable rescue boat and shelter from a simulated regional network, while explaining why.

## Objectives

- Demonstrate genuine rule-based (non-ML) AI reasoning applied to a real, current, high-stakes problem — the mandatory constraint of the course this project originates from.
- Ground every rule and threshold in real data where possible, and explicitly flag anything that is the project's own assumption rather than sourced fact (see `09-Assumptions-and-Provenance.md`).
- Model resource selection as compound, multi-attribute matching (a unit must satisfy every required capability at once), not naive nearest-match — this is the system's central design argument and is demonstrated concretely in `07-Worked-Example-Acceptance-Test.md`.
- Remain a decision-support tool throughout: it advises a human responder, it never acts autonomously.

## Target users

- **Primary:** a township-level emergency responder — a Myanmar Red Cross Society (MRCS) branch coordinator or Township Disaster Management Committee member.
- **Secondary, named but not built for in this version:** a regional coordinator overseeing multiple townships during a region-wide event; an operations/admin user updating fleet, shelter, or gauge data (currently direct data edits only, no admin UI).
- **What the system explicitly is not:** autonomous. It does not contact rescue crews or shelters directly, and it does not override human judgment.

## Functional Requirements

FR-1. The system SHALL accept a structured flood report for a single township via `POST /api/flood-case`, per the schema in `02-Data-Model-and-Persistence.md` Section "Case."

FR-2. The system SHALL determine severity (`low | moderate | high | severe`) for a reported township using the Prolog rules in `04-Prolog-Reasoning-Module.md` — driven by exactly four inputs: gauge reading vs. danger level, embankment status, terrain, local rainfall — and no others.

FR-3. The system SHALL apply an unconditional severity override to `severe` whenever `embankment_status = breached`, regardless of any other input.

FR-4. The system SHALL map severity deterministically to a `recommended_action` string per the fixed table in `04-Prolog-Reasoning-Module.md`.

FR-5. The system SHALL derive a `required_capabilities` set (subset of `{motorized, medical_support}`) for each case from `road_status`, `severity`, and `injured_survivors`, per `04-Prolog-Reasoning-Module.md`.

FR-6. The system SHALL compute a `priority_score` (0–59) and `priority_band` independently of severity, per the weighted factors in `05-API-and-Backend-Logic.md`.

FR-7. The system SHALL select a rescue unit and a shelter by compound capability filtering — a candidate MUST satisfy every entry in `required_capabilities`, not merely the majority — followed by shortest-path selection via Dijkstra over the network in `03-Regional-Network-and-Seed-Data.md`.

FR-8. The system SHALL fall back per the documented relaxation order (drop `medical_support` first, then return a null assignment with an escalation flag) when no candidate satisfies the full requirement set, per `05-API-and-Backend-Logic.md` Section 9.1/9.2.

FR-9. The system SHALL reserve the selected unit and shelter atomically (via a single database transaction) at the moment of selection, before the API response is returned, per `02-Data-Model-and-Persistence.md` and `05-API-and-Backend-Logic.md` Section 11.

FR-10. The system SHALL expose the full case lifecycle (`open → assessed → dispatched → resolved | cancelled`) and the corresponding resource-status transitions via the endpoints in `05-API-and-Backend-Logic.md` Section 12.

FR-11. The system SHALL provide an explainability ("Why?") element in the UI surfacing the gauge station referenced, the computed `gauge_percent`, and the `severity_reason` (e.g., `embankment_breach_override`), per `06-Frontend-UI-Spec.md`.

FR-12. The system SHALL provide a regional overview screen listing all open/assessed/dispatched cases, color-coded by severity, per `06-Frontend-UI-Spec.md`.

## Non-Functional Requirements

NFR-1 (Fail-safe over confident-but-wrong). On any unreliable or missing dependency — Prolog unreachable, a required fact absent, a malformed upstream response — the system SHALL return an explicit error (422 or 503, per `05-API-and-Backend-Logic.md` Section 12.3) rather than a guessed or partial result. Never silently default.

NFR-2 (No machine learning). All reasoning in the severity/action/capability path SHALL be rule-based Prolog. This is a hard project constraint, not a preference.

NFR-3 (Data integrity under concurrency). Two simultaneous requests for the same rescue unit or shelter SHALL be arbitrated by the database's own row-locking within a single transaction, not by application-level logic — see `02-Data-Model-and-Persistence.md`.

NFR-4 (Accessibility / field-use). The UI SHALL use categorical inputs (dropdowns/toggles) rather than free text wherever the underlying field is categorical, target a mid-range Android phone browser at outdoor brightness, and use plain, non-technical language throughout — per `06-Frontend-UI-Spec.md`.

NFR-5 (No authentication in this version). The system explicitly SHALL NOT implement authentication or role-based access control in this build — stated as a deliberate scope decision in `09-Assumptions-and-Provenance.md`, not an oversight. Do not add it without being asked; see `11-Future-Expansion.md`.

NFR-6 (Provenance discipline). Any value not traceable to a cited real-world source SHALL be explicitly marked as a flagged assumption in `09-Assumptions-and-Provenance.md`, never presented as verified fact.

NFR-7 (Extensibility, not built now). The `required_capability` pattern, the hazard-tier switch, and the Prolog/API separation are designed to support the items in `11-Future-Expansion.md` (a second hazard regime, a third capability dimension, multi-hazard generalization) without a redesign — but none of that is in scope for this build.

NFR-8 (Regression stability). Any change to the Prolog rules, priority weights, or routing logic SHALL be checked against `07-Worked-Example-Acceptance-Test.md` before being considered complete — it is the system's canonical regression test.
