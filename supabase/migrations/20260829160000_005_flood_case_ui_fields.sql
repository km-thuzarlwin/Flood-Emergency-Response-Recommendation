-- UI-support fields for the Results screen (doc 6). Like severity_reason /
-- gauge_percent (migration 001), these are assessment outputs the responder must
-- see when re-opening a case — not new inputs. The routing *paths* are recomputed
-- on read; the distances + notes are the assessment-time record.

alter table flood_case
  add column assigned_unit_distance     integer,
  add column assigned_shelter_distance  integer,
  add column notes                      text[] not null default '{}';
