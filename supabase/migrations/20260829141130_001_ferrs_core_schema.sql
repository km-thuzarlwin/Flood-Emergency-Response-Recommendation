-- FERRS core schema — transcribed from Handoffs/02-Data-Model-and-Persistence.md
-- Every rescue unit is a boat (doc 2 §5.5); no land-vehicle type.
-- No auth / RLS in this build (NFR-5) — app connects as service role.

-- ---------- Enumerated domains ----------
create type hazard_tier       as enum ('riverine_upper','riverine_central','coastal_surge','hub');
create type local_rainfall    as enum ('light','moderate','heavy','very_heavy');
create type embankment_status as enum ('intact','breached');
create type terrain           as enum ('low_lying','elevated');
create type road_status       as enum ('open','impassable');
create type case_status       as enum ('open','assessed','dispatched','resolved','cancelled');
create type severity_level    as enum ('low','moderate','high','severe');
create type priority_band     as enum ('low','moderate','high','critical');
create type capability        as enum ('motorized','medical_support');
create type unit_status       as enum ('available','reserved','deployed');
create type unit_mobility     as enum ('motorized','standard');
create type shelter_status    as enum ('accepting','full','reserved_full');
create type shelter_capability as enum ('general','medical_equipped');

-- ---------- GaugeStation (doc 2 §5.2) ----------
create table gauge_station (
  id              text primary key,
  river           text    not null,
  danger_level_cm integer not null check (danger_level_cm > 0),
  source_note     text    not null
);

-- ---------- Township / network node (doc 2 §5.1) ----------
create table township (
  id              text primary key,               -- slug, used as the Prolog atom directly
  display_name    text        not null,
  district        text        not null,
  hazard_tier     hazard_tier not null,
  gauge_station_id text references gauge_station(id),   -- nullable: coastal tier has no riverine gauge
  lat             double precision not null,
  lng             double precision not null,
  is_base         boolean     not null default false   -- true only for Yegyi; no logic depends on it
);
create index township_gauge_station_idx on township(gauge_station_id);

-- ---------- NetworkEdge (doc 2 §5.3) — undirected water-route graph ----------
create table network_edge (
  id               bigint generated always as identity primary key,
  from_township_id text    not null references township(id),
  to_township_id   text    not null references township(id),
  distance         numeric not null check (distance > 0),  -- abstract relative units, NOT km
  passable         boolean not null default true,          -- water-route obstruction only; NOT road_status
  constraint network_edge_endpoints_distinct check (from_township_id <> to_township_id)
);
-- one row per unordered pair
create unique index network_edge_unordered_uidx
  on network_edge (least(from_township_id, to_township_id), greatest(from_township_id, to_township_id));

-- ---------- RescueUnit (doc 2 §5.5) — always a boat ----------
create table rescue_unit (
  id               text primary key,                  -- "RB-01" = Rescue Boat
  home_township_id text        not null references township(id),
  status           unit_status not null default 'available',
  mobility         unit_mobility not null,            -- motorized = engine boat, standard = paddle boat
  medical_support  boolean     not null default false,-- trained person aboard, NOT a first-aid kit
  capacity         integer                            -- not enforced by any rule in this version
);
create index rescue_unit_status_idx on rescue_unit(status);

-- ---------- Shelter (doc 2 §5.6) ----------
create table shelter (
  id           text primary key,
  display_name text              not null,
  township_id  text              not null references township(id),
  status       shelter_status    not null default 'accepting',
  capability   shelter_capability not null default 'general',  -- medical_equipped = supplies AND on-site health worker
  capacity     integer
);
create index shelter_status_idx on shelter(status);

-- ---------- Case / one flood report (doc 2 §5.4) ----------
create table flood_case (
  case_id                  text primary key,                 -- FLD-YYYYMMDD-NNN
  township_id              text    not null references township(id),
  -- reported inputs
  gauge_reading_cm         integer not null check (gauge_reading_cm >= 0),
  upstream_heavy_rain_days  integer not null check (upstream_heavy_rain_days >= 0),
  local_rainfall           local_rainfall    not null,
  embankment_status        embankment_status not null,
  terrain                  terrain           not null,
  road_status              road_status       not null,
  vulnerable_present       boolean not null,
  injured_survivors        boolean not null,
  affected_population      integer not null check (affected_population >= 0),
  reported_at              timestamptz not null default now(),  -- server-set
  status                   case_status not null default 'open',
  -- assigned by the pipeline
  severity                 severity_level,
  severity_reason          text,                               -- e.g. 'embankment_breach_override' (FR-11)
  gauge_percent            integer,                            -- surfaced in the "Why?" trace (FR-11)
  recommended_action       text,
  required_capabilities    capability[],                       -- subset of {motorized, medical_support}
  priority_score           integer check (priority_score is null or priority_score between 0 and 59),
  priority_band            priority_band,
  assigned_unit_id         text references rescue_unit(id),
  assigned_shelter_id      text references shelter(id)
);
create index flood_case_status_idx    on flood_case(status);
create index flood_case_township_idx  on flood_case(township_id);
create index flood_case_reported_idx  on flood_case(reported_at);
