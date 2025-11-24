-- Fix tournament_bans table to allow nullable user_id for team bans
-- This migration makes user_id nullable to support team bans

begin;

-- Drop the check constraint if it exists (we'll recreate it)
do $$ begin
  if exists (
    select 1 from pg_constraint where conname = 'tournament_bans_user_or_team'
  ) then
    alter table public.tournament_bans drop constraint tournament_bans_user_or_team;
  end if;
end $$;

-- Make user_id nullable if it's currently NOT NULL
do $$ begin
  -- Check if user_id has a NOT NULL constraint
  if exists (
    select 1 
    from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'tournament_bans' 
      and column_name = 'user_id'
      and is_nullable = 'NO'
  ) then
    alter table public.tournament_bans alter column user_id drop not null;
  end if;
end $$;

-- Recreate the check constraint to require exactly one of user_id or team_id
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'tournament_bans_user_or_team'
  ) then
    alter table public.tournament_bans add constraint tournament_bans_user_or_team check (
      (user_id is not null)::int + (team_id is not null)::int = 1
    );
  end if;
end $$;

commit;

