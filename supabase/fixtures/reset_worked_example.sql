-- Restore the doc-7 acceptance-test fixture to its baseline (migrations 002 + 003)
-- and clear all flood cases. Run this before re-running the end-to-end acceptance
-- test, or any time a test/manual run has left resources reserved.
--
--   psql "$DATABASE_URL" -f supabase/fixtures/reset_worked_example.sql
--   -- or paste into the Supabase SQL editor

delete from flood_case;

update rescue_unit set status = 'available' where id in ('RB-01', 'RB-02', 'RB-04', 'RB-05');
update rescue_unit set status = 'deployed'  where id = 'RB-03';

update shelter set status = 'full'      where id = 'S-01';
update shelter set status = 'accepting' where id in ('S-02', 'S-03', 'S-04');
