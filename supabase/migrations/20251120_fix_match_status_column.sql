-- Fix tournament_matches.status column to ensure it accepts 'pending', 'in_progress', 'completed'
-- Convert from enum to text if needed, or ensure check constraint is correct

begin;

-- Drop existing check constraint if it exists
alter table if exists public.tournament_matches
  drop constraint if exists tournament_matches_status_check;

-- If column is enum type, convert to text
do $$
begin
  -- Check if column exists and is enum type
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournament_matches'
      and column_name = 'status'
      and udt_name != 'text'
  ) then
    -- Convert enum to text
    alter table public.tournament_matches
      alter column status type text using status::text;
  end if;
exception when others then
  -- If column doesn't exist or other error, continue
  null;
end $$;

-- First, fix any invalid status values in existing rows
-- Map common invalid values to valid ones
update public.tournament_matches
set status = case
  when status is null then 'pending'
  when status in ('scheduled', 'not_started', 'upcoming') then 'pending'
  when status in ('live', 'ongoing', 'active') then 'in_progress'
  when status in ('done', 'finished', 'ended') then 'completed'
  when status not in ('pending', 'in_progress', 'completed') then 'pending'
  else status
end
where status is null or status not in ('pending', 'in_progress', 'completed');

-- Add check constraint with correct values
do $$
begin
  alter table public.tournament_matches
    add constraint tournament_matches_status_check
    check (status in ('pending', 'in_progress', 'completed'));
exception when duplicate_object then
  -- Constraint already exists, that's fine
  null;
end $$;

-- Ensure default is set
alter table if exists public.tournament_matches
  alter column status set default 'pending';

commit;

