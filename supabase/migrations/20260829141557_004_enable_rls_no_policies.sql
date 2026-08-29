-- Close the unused PostgREST/anon surface. This is NOT app-level auth (NFR-5):
-- the FERRS API route connects via a direct Postgres connection as the `postgres`
-- role, which has BYPASSRLS. Enabling RLS with zero policies simply means the
-- auto-generated Supabase REST API (anon/authenticated keys) can neither read nor
-- write these tables — removing an attack path that would otherwise undercut the
-- reservation integrity guarantees in doc 2 / NFR-3.

alter table public.gauge_station enable row level security;
alter table public.township      enable row level security;
alter table public.network_edge  enable row level security;
alter table public.rescue_unit   enable row level security;
alter table public.shelter       enable row level security;
alter table public.flood_case    enable row level security;
