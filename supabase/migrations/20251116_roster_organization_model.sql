-- Enforce organization/roster model:
-- Teams = Organizations (one team = one organization)
-- Rosters = Game-specific teams that compete in tournaments (one roster per game per organization)
-- Tournament participants register via rosters, not teams directly

begin;

-- 1. Ensure one roster per game per organization (team)
do $$ begin
  -- Drop existing unique constraint if it exists
  drop index if exists idx_team_rosters_team_game_unique;
  
  -- Create unique constraint: one roster per game per team
  create unique index if not exists idx_team_rosters_team_game_unique 
    on public.team_rosters(team_id, game);
exception when others then
  -- If constraint already exists or table doesn't exist, continue
  null;
end $$;

-- 2. Add index on roster_id in tournament_participants for faster lookups
create index if not exists idx_tournament_participants_roster_id 
  on public.tournament_participants(roster_id) 
  where roster_id is not null;

-- 3. Add index on team_id in tournament_participants (for organization-level queries)
create index if not exists idx_tournament_participants_team_id 
  on public.tournament_participants(team_id) 
  where team_id is not null;

-- 4. Add index on game in team_rosters for faster roster lookups by game
create index if not exists idx_team_rosters_game 
  on public.team_rosters(game);

-- 5. Add index on team_id in team_rosters (already should exist via FK, but explicit is better)
create index if not exists idx_team_rosters_team_id 
  on public.team_rosters(team_id);

-- 6. Ensure tournament_participants has proper foreign key to rosters
-- (This should already exist, but we'll verify)
do $$ begin
  -- Check if foreign key exists, if not add it
  if not exists (
    select 1 from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu 
      on tc.constraint_name = kcu.constraint_name
    where tc.table_name = 'tournament_participants'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'roster_id'
      and kcu.table_schema = 'public'
  ) then
    -- Add foreign key if it doesn't exist
    alter table public.tournament_participants
      add constraint fk_tournament_participants_roster_id
      foreign key (roster_id) 
      references public.team_rosters(id) 
      on delete set null;
  end if;
exception when others then
  -- Ignore if constraint already exists or table doesn't exist
  null;
end $$;

-- 7. Add constraint to ensure roster_name matches the actual roster name when roster_id is set
-- This is a check constraint that validates data integrity
create or replace function public.validate_roster_name_match()
returns trigger as $func$
begin
  if new.roster_id is not null and new.roster_name is not null then
    if not exists (
      select 1 from public.team_rosters 
      where id = new.roster_id 
        and name = new.roster_name
    ) then
      raise exception 'roster_name does not match the roster_id';
    end if;
  end if;
  return new;
end;
$func$ language plpgsql;

drop trigger if exists trigger_validate_roster_name on public.tournament_participants;
create trigger trigger_validate_roster_name
  before insert or update on public.tournament_participants
  for each row
  execute function public.validate_roster_name_match();

-- 8. Add helpful comment to clarify the model
comment on table public.teams is 
  'Organizations/Teams: Each row represents one organization that can have multiple game-specific rosters.';

comment on table public.team_rosters is 
  'Game-specific rosters: Each row represents one roster for a specific game within an organization. One roster per game per organization. These are the entities that compete in tournaments.';

comment on column public.tournament_participants.roster_id is 
  'The roster (game-specific team) that is registered for this tournament. This is the competing entity, not the organization (team_id).';

comment on column public.tournament_participants.team_id is 
  'The organization (team) that owns the roster. Kept for reference and organization-level queries.';

commit;

