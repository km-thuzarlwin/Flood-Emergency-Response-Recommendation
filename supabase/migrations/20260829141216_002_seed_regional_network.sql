-- Regional seed data — transcribed from Handoffs/03-Regional-Network-and-Seed-Data.md
-- Danger levels: real DMH data (26 June 2025 forecast). Township->station mapping,
-- district assignment, hazard_tier of the Ngawun corridor, and coordinates are this
-- project's own inference (see 10-Decision-Log.md) — display/reference only, no rule reads them.

-- ---------- 6 GaugeStations (doc 3 §6.2) ----------
insert into gauge_station (id, river, danger_level_cm, source_note) values
  ('hinthada_gauge',        'Ayeyarwady',     1342, 'DMH daily water-level forecast, 26 June 2025'),
  ('zalun_gauge',           'Ayeyarwady',     1160, 'DMH daily water-level forecast, 26 June 2025'),
  ('ngathaingchaung_gauge', 'Ngawun',         1160, 'DMH daily water-level forecast, 26 June 2025'),
  ('thabaung_gauge',        'Ngawun',          620, 'DMH daily water-level forecast, 26 June 2025'),
  ('maubin_gauge',          'Toe',             720, 'DMH daily water-level forecast, 26 June 2025'),
  ('pathein_gauge',         'Pathein/Ngawun',  350, 'DMH daily water-level forecast, 26 June 2025');

-- ---------- 25 Townships (doc 3 §6.1) ----------
insert into township (id, display_name, district, hazard_tier, gauge_station_id, lat, lng, is_base) values
  -- Riverine upper — Ayeyarwady mainstem
  ('hinthada',        'Hinthada',        'Hinthada', 'riverine_upper',   'hinthada_gauge',        17.65, 95.47, false),
  ('zalun',           'Zalun',           'Hinthada', 'riverine_upper',   'zalun_gauge',           17.45, 95.55, false),
  ('myanaung',        'Myanaung',        'Hinthada', 'riverine_upper',   'zalun_gauge',           18.28, 95.32, false),
  ('kyangin',         'Kyangin',         'Hinthada', 'riverine_upper',   'zalun_gauge',           18.35, 95.24, false),
  ('ingapu',          'Ingapu',          'Hinthada', 'riverine_upper',   'zalun_gauge',           18.06, 95.24, false),
  -- Riverine central — Ngawun corridor
  ('lemyethna',       'Lemyethna',       'Hinthada', 'riverine_central', 'ngathaingchaung_gauge', 17.60, 95.20, false),
  ('ngathaingchaung', 'Ngathaingchaung', 'Pathein',  'riverine_central', 'ngathaingchaung_gauge', 17.38, 95.00, false),
  ('thabaung',        'Thabaung',        'Pathein',  'riverine_central', 'thabaung_gauge',        17.05, 94.75, false),
  ('yegyi',           'Yegyi',           'Pathein',  'riverine_central', 'ngathaingchaung_gauge', 17.38, 95.20, true),
  ('kyonpyaw',        'Kyonpyaw',        'Pathein',  'riverine_central', 'ngathaingchaung_gauge', 17.30, 95.19, false),
  ('kyaunggon',       'Kyaunggon',       'Pathein',  'riverine_central', 'thabaung_gauge',        17.13, 95.20, false),
  ('kangyidaunt',     'Kangyidaunt',     'Pathein',  'riverine_central', 'thabaung_gauge',        16.96, 94.88, false),
  -- Riverine central — Toe River / Ma-ubin district
  ('maubin',          'Maubin',          'Maubin',   'riverine_central', 'maubin_gauge',          16.73, 95.65, false),
  ('pantanaw',        'Pantanaw',        'Maubin',   'riverine_central', 'maubin_gauge',          17.05, 95.44, false),
  ('nyaungdon',       'Nyaungdon',       'Maubin',   'riverine_central', 'maubin_gauge',          17.04, 95.63, false),
  ('danubyu',         'Danubyu',         'Maubin',   'riverine_central', 'maubin_gauge',          17.25, 95.55, false),
  -- Hub
  ('pathein',         'Pathein',         'Pathein',  'hub',              'pathein_gauge',         16.78, 94.73, false),
  -- Coastal — cyclone storm-surge zone (network nodes only; hazard not modeled this build)
  ('ngapudaw',        'Ngapudaw',        'Pathein',  'coastal_surge',    null, 16.43, 94.69, false),
  ('mawlamyinegyun',  'Mawlamyinegyun',  'Labutta',  'coastal_surge',    null, 16.38, 95.26, false),
  ('labutta',         'Labutta',         'Labutta',  'coastal_surge',    null, 16.15, 94.76, false),
  ('myaungmya',       'Myaungmya',       'Myaungmya','coastal_surge',    null, 16.60, 94.93, false),
  ('bogale',          'Bogale',          'Pyapon',   'coastal_surge',    null, 16.29, 95.40, false),
  ('pyapon',          'Pyapon',          'Pyapon',   'coastal_surge',    null, 16.28, 95.68, false),
  ('dedaye',          'Dedaye',          'Pyapon',   'coastal_surge',    null, 16.42, 95.87, false),
  ('kyaiklat',        'Kyaiklat',        'Pyapon',   'coastal_surge',    null, 16.44, 95.73, false);

-- ---------- 26 NetworkEdges (doc 3 §6.3, canonical table) ----------
insert into network_edge (from_township_id, to_township_id, distance) values
  ('hinthada','zalun',3),
  ('zalun','myanaung',3),
  ('myanaung','kyangin',3),
  ('zalun','ingapu',3),
  ('hinthada','lemyethna',4),
  ('lemyethna','ngathaingchaung',3),
  ('ngathaingchaung','thabaung',3),
  ('lemyethna','yegyi',3),
  ('yegyi','kyonpyaw',2),
  ('kyonpyaw','kyaunggon',2),
  ('kyonpyaw','kangyidaunt',3),
  ('thabaung','pathein',3),
  ('kyonpyaw','nyaungdon',3),
  ('nyaungdon','maubin',2),
  ('maubin','pantanaw',2),
  ('maubin','danubyu',3),
  ('pathein','ngapudaw',3),
  ('pathein','mawlamyinegyun',4),
  ('mawlamyinegyun','labutta',3),
  ('mawlamyinegyun','bogale',3),
  ('mawlamyinegyun','myaungmya',3),
  ('myaungmya','labutta',4),
  ('bogale','pyapon',3),
  ('pyapon','dedaye',2),
  ('pyapon','kyaiklat',3),
  ('pantanaw','dedaye',4);
