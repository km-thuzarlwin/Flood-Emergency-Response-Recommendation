-- Report-form v2 (see Handoffs/10-Decision-Log.md, 2026-08-30).
-- The DB column stores the responder's actual answer; the API route maps it to the
-- reasoner's value before calling Prolog and records the mapping in `assumptions`.

alter type local_rainfall    add value if not exists 'no_rain';
alter type local_rainfall    add value if not exists 'unknown';
alter type embankment_status add value if not exists 'at_risk';
alter type embankment_status add value if not exists 'unknown';
alter type road_status       add value if not exists 'limited';
alter type road_status       add value if not exists 'unknown';

alter table flood_case
  add column if not exists report_detail jsonb    not null default '{}'::jsonb,
  add column if not exists assumptions   text[]   not null default '{}';

comment on column flood_case.report_detail is 'The responder''s raw answers (landform, vulnerable_groups, river-level choice, upstream bucket, …) — what was reported, before mapping to the reasoner enums.';
comment on column flood_case.assumptions   is 'Human-readable notes for every Unknown / mapped answer, shown as "Assumptions made" on the Results screen.';
