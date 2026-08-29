-- Fleet & shelter baseline — from Handoffs/07-Worked-Example-Acceptance-Test.md
-- This is the canonical fixture for the Lemyethna acceptance test. The acceptance
-- test mutates status (RB-01 + S-03 -> reserved); a re-runnable reset routine will
-- be added in Phase 3. Until then, restore with 003 values if a test run dirties them.

insert into rescue_unit (id, home_township_id, status, mobility, medical_support, capacity) values
  ('RB-01', 'yegyi',     'available', 'motorized', true,  null),
  ('RB-02', 'lemyethna', 'available', 'motorized', false, null),
  ('RB-03', 'pathein',   'deployed',  'motorized', true,  null),
  ('RB-04', 'myaungmya', 'available', 'standard',  false, null),
  ('RB-05', 'bogale',    'available', 'motorized', true,  null);

insert into shelter (id, display_name, township_id, status, capability, capacity) values
  ('S-01', 'Yegyi High School',              'yegyi',     'full',      'general',         null),
  ('S-02', 'Lemyethna Monastery',            'lemyethna', 'accepting', 'general',         null),
  ('S-03', 'Pathein General Hospital Annex', 'pathein',   'accepting', 'medical_equipped',null),
  ('S-04', 'Myaungmya Community Hall',       'myaungmya', 'accepting', 'general',         null);
