-- Team rosters (per game) + roster members, and participants roster columns
-- Safe/idemponent where possible
begin;

-- Create team_rosters table
create table if not exists public.team_rosters (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  game text not null,
  format text, -- e.g., 'solo','duo','trio','5v5'
  team_size integer not null check (team_size >= 1 and team_size <= 10),
  created_at timestamptz not null default now()
);

-- Create team_roster_members
create table if not exists public.team_roster_members (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.team_rosters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text, -- optional role within roster
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (roster_id, user_id)
);

-- Add roster_id/roster_name on tournament_participants for reference
do $$ begin
  alter table public.tournament_participants
    add column if not exists roster_id uuid null references public.team_rosters(id) on delete set null,
    add column if not exists roster_name text null;
exception when undefined_table then
  -- table may not exist in older schemas; ignore
  null;
end $$;

-- RLS
alter table if exists public.team_rosters enable row level security;
alter table if exists public.team_roster_members enable row level security;

-- Select policies: team members can read
do $$ begin
  create policy tr_select_team_members on public.team_rosters for select using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_rosters.team_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
    )
    or exists (
      select 1 from public.teams t
      where t.id = team_rosters.team_id
        and t.owner_id = auth.uid()
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy trm_select_team_members on public.team_roster_members for select using (
    exists (
      select 1 from public.team_rosters r
      join public.team_members tm on tm.team_id = r.team_id and tm.user_id = auth.uid() and tm.is_active = true
      where r.id = roster_id
    )
    or exists (
      select 1 from public.team_rosters r
      join public.teams t on t.id = r.team_id and t.owner_id = auth.uid()
      where r.id = roster_id
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- Insert/update/delete: team owner or service role
do $$ begin
  create policy tr_modify_owner on public.team_rosters
  for all
  using (
    exists (select 1 from public.teams t where t.id = team_rosters.team_id and t.owner_id = auth.uid())
    or auth.role() = 'service_role'
  )
  with check (
    exists (select 1 from public.teams t where t.id = team_rosters.team_id and t.owner_id = auth.uid())
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy trm_modify_owner on public.team_roster_members
  for all
  using (
    exists (
      select 1 from public.team_rosters r
      join public.teams t on t.id = r.team_id
      where r.id = roster_id and t.owner_id = auth.uid()
    )
    or auth.role() = 'service_role'
  )
  with check (
    exists (
      select 1 from public.team_rosters r
      join public.teams t on t.id = r.team_id
      where r.id = roster_id and t.owner_id = auth.uid()
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;


