-- Tournament bans table
-- Track banned participants/teams from tournaments

begin;

-- Create table if it doesn't exist
create table if not exists public.tournament_bans (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  participant_id uuid references public.tournament_participants(id) on delete set null,
  ban_reason text not null,
  banned_by uuid not null references auth.users(id) on delete set null,
  banned_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- Add columns if they don't exist (in case table was created before without them)
do $$ begin
  -- Add user_id if missing
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tournament_bans' and column_name = 'user_id') then
    alter table public.tournament_bans add column user_id uuid references auth.users(id) on delete set null;
  end if;

  -- Add team_id if missing
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tournament_bans' and column_name = 'team_id') then
    alter table public.tournament_bans add column team_id uuid references public.teams(id) on delete set null;
  end if;

  -- Add participant_id if missing
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tournament_bans' and column_name = 'participant_id') then
    alter table public.tournament_bans add column participant_id uuid references public.tournament_participants(id) on delete set null;
  end if;

  -- Add is_active if missing
  if not exists (select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'tournament_bans' and column_name = 'is_active') then
    alter table public.tournament_bans add column is_active boolean not null default true;
  end if;
end $$;

-- Add constraint if it doesn't exist
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'tournament_bans_user_or_team'
  ) then
    alter table public.tournament_bans add constraint tournament_bans_user_or_team check (
      (user_id is not null)::int + (team_id is not null)::int = 1
    );
  end if;
end $$;

create index if not exists idx_tournament_bans_tournament on public.tournament_bans(tournament_id);
create index if not exists idx_tournament_bans_user on public.tournament_bans(user_id) where user_id is not null;
create index if not exists idx_tournament_bans_team on public.tournament_bans(team_id) where team_id is not null;
create index if not exists idx_tournament_bans_active on public.tournament_bans(is_active) where is_active = true;

alter table public.tournament_bans enable row level security;

-- RLS: Organizers can read all bans for their tournaments, users can read their own bans
do $$ begin
  create policy tb_select_organizer_or_self on public.tournament_bans for select
  using (
    -- Organizer of the tournament
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
    -- User can see their own ban
    or user_id = auth.uid()
    -- Team owner can see team bans
    or exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- Only organizers can insert/update/delete bans
do $$ begin
  create policy tb_modify_organizer on public.tournament_bans for all
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
    or auth.role() = 'service_role'
  )
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;

