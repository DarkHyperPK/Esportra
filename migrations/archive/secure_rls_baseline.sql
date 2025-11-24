-- Secure RLS Baseline (Idempotent)
-- This script enables RLS on core tables and adds minimal, app-aligned policies.
-- It also adds common indexes and an RPC for accurate participant counts.
-- Run in Supabase SQL Editor. Safe to re-run.

-- PROFILES --------------------------------------------------------------------
alter table if exists public.profiles enable row level security;

do $$
begin
  -- Allow everyone to read profiles (for role switcher/admin UI). Adjust later if needed.
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_public_read'
  ) then
    create policy profiles_public_read
    on public.profiles for select
    to anon, authenticated, service_role
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_update_self'
  ) then
    create policy profiles_update_self
    on public.profiles for update
    to authenticated, service_role
    using (id = auth.uid() or auth.role() = 'service_role')
    with check (id = auth.uid() or auth.role() = 'service_role');
  end if;
end$$;

-- TEAMS -----------------------------------------------------------------------
alter table if exists public.teams enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='teams' and policyname='teams_public_read'
  ) then
    create policy teams_public_read
    on public.teams for select
    to anon, authenticated, service_role
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='teams' and policyname='teams_owner_write'
  ) then
    -- Backward-compat: if older combined policy existed, skip
    null;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='teams' and policyname='teams_owner_insert'
  ) then
    create policy teams_owner_insert
    on public.teams for insert
    to authenticated, service_role
    with check (owner_id = auth.uid() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='teams' and policyname='teams_owner_update'
  ) then
    create policy teams_owner_update
    on public.teams for update
    to authenticated, service_role
    using (owner_id = auth.uid() or auth.role() = 'service_role')
    with check (owner_id = auth.uid() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='teams' and policyname='teams_owner_delete'
  ) then
    create policy teams_owner_delete
    on public.teams for delete
    to authenticated, service_role
    using (owner_id = auth.uid() or auth.role() = 'service_role');
  end if;
end$$;

-- TEAM MEMBERS ----------------------------------------------------------------
alter table if exists public.team_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='team_members' and policyname='team_members_member_read'
  ) then
    create policy team_members_member_read
    on public.team_members for select
    to authenticated, service_role
    using (
      auth.role() = 'service_role' or
      exists (
        select 1 from public.teams t
        where t.id = team_id and (
          t.owner_id = auth.uid() or
          exists (select 1 from public.team_members m where m.team_id = t.id and m.user_id = auth.uid())
        )
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='team_members' and policyname='team_members_owner_write'
  ) then
    null;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='team_members' and policyname='team_members_owner_insert'
  ) then
    create policy team_members_owner_insert
    on public.team_members for insert
    to authenticated, service_role
    with check (
      auth.role() = 'service_role' or
      exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='team_members' and policyname='team_members_owner_update'
  ) then
    create policy team_members_owner_update
    on public.team_members for update
    to authenticated, service_role
    using (
      auth.role() = 'service_role' or
      exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    )
    with check (
      auth.role() = 'service_role' or
      exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='team_members' and policyname='team_members_owner_delete'
  ) then
    create policy team_members_owner_delete
    on public.team_members for delete
    to authenticated, service_role
    using (
      auth.role() = 'service_role' or
      exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    );
  end if;
end$$;

-- TOURNAMENTS -----------------------------------------------------------------
alter table if exists public.tournaments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_public_read'
  ) then
    create policy tournaments_public_read
    on public.tournaments for select
    to anon, authenticated, service_role
    using (is_public = true or auth.role() = 'service_role' or organizer_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_organizer_write'
  ) then
    null;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_organizer_insert'
  ) then
    create policy tournaments_organizer_insert
    on public.tournaments for insert
    to authenticated, service_role
    with check (organizer_id = auth.uid() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_organizer_update'
  ) then
    create policy tournaments_organizer_update
    on public.tournaments for update
    to authenticated, service_role
    using (organizer_id = auth.uid() or auth.role() = 'service_role')
    with check (organizer_id = auth.uid() or auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournaments' and policyname='tournaments_organizer_delete'
  ) then
    create policy tournaments_organizer_delete
    on public.tournaments for delete
    to authenticated, service_role
    using (organizer_id = auth.uid() or auth.role() = 'service_role');
  end if;
end$$;

-- TOURNAMENT PARTICIPANTS -----------------------------------------------------
alter table if exists public.tournament_participants enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournament_participants' and policyname='tp_public_read'
  ) then
    create policy tp_public_read
    on public.tournament_participants for select
    to anon, authenticated, service_role
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournament_participants' and policyname='tp_user_write'
  ) then
    null;
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournament_participants' and policyname='tp_user_insert'
  ) then
    create policy tp_user_insert
    on public.tournament_participants for insert
    to authenticated, service_role
    with check (
      auth.role() = 'service_role' or
      user_id = auth.uid() or team_captain_id = auth.uid()
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournament_participants' and policyname='tp_user_update'
  ) then
    create policy tp_user_update
    on public.tournament_participants for update
    to authenticated, service_role
    using (
      auth.role() = 'service_role' or
      user_id = auth.uid() or team_captain_id = auth.uid()
    )
    with check (
      auth.role() = 'service_role' or
      user_id = auth.uid() or team_captain_id = auth.uid()
    );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tournament_participants' and policyname='tp_user_delete'
  ) then
    create policy tp_user_delete
    on public.tournament_participants for delete
    to authenticated, service_role
    using (
      auth.role() = 'service_role' or
      user_id = auth.uid() or team_captain_id = auth.uid()
    );
  end if;
end$$;

-- OPTIONAL: helpful indexes ---------------------------------------------------
create index if not exists idx_tp_tournament_id on public.tournament_participants (tournament_id);
create index if not exists idx_tm_team_id on public.team_members (team_id);
create index if not exists idx_tournaments_organizer_id on public.tournaments (organizer_id);

-- RPC for exact participant counts (used by UI fallback) ---------------------
create or replace function public.get_tournament_participant_count(t_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.tournament_participants where tournament_id = t_id;
$$;

grant execute on function public.get_tournament_participant_count(uuid) to anon, authenticated, service_role;

-- USER ROLES ------------------------------------------------------------------
alter table if exists public.user_roles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_public_read'
  ) then
    create policy user_roles_public_read
    on public.user_roles for select
    to anon, authenticated, service_role
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_service_insert'
  ) then
    create policy user_roles_service_insert
    on public.user_roles for insert
    to service_role
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_service_update'
  ) then
    create policy user_roles_service_update
    on public.user_roles for update
    to service_role
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_roles' and policyname='user_roles_service_delete'
  ) then
    create policy user_roles_service_delete
    on public.user_roles for delete
    to service_role
    using (true);
  end if;
end$$;

-- VERIFIED ROLES --------------------------------------------------------------
alter table if exists public.verified_roles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='verified_roles' and policyname='verified_roles_public_read'
  ) then
    create policy verified_roles_public_read
    on public.verified_roles for select
    to anon, authenticated, service_role
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='verified_roles' and policyname='verified_roles_service_insert'
  ) then
    create policy verified_roles_service_insert
    on public.verified_roles for insert
    to service_role
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='verified_roles' and policyname='verified_roles_service_update'
  ) then
    create policy verified_roles_service_update
    on public.verified_roles for update
    to service_role
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='verified_roles' and policyname='verified_roles_service_delete'
  ) then
    create policy verified_roles_service_delete
    on public.verified_roles for delete
    to service_role
    using (true);
  end if;
end$$;
