-- Ensure tournament_participants entries are deleted when a team is deleted
begin;

do $$
declare
  constraint_name text;
begin
  -- Find existing FK constraint on tournament_participants.team_id (if any)
  select tc.constraint_name into constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'tournament_participants'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'team_id'
  limit 1;

  -- Drop existing FK if present (to replace with ON DELETE CASCADE)
  if constraint_name is not null then
    execute format('alter table public.tournament_participants drop constraint %I', constraint_name);
  end if;
exception when undefined_table then
  -- Table might not exist in some schemas; ignore
  null;
end $$;

-- Recreate FK with ON DELETE CASCADE (if table exists)
do $$
begin
  alter table if exists public.tournament_participants
    add constraint tournament_participants_team_fk
    foreign key (team_id) references public.teams(id) on delete cascade;
exception when duplicate_object then null;
end $$;

-- Helpful index for team cleanup queries
do $$
begin
  create index if not exists idx_tournament_participants_team_id on public.tournament_participants(team_id);
exception when duplicate_table then null;
end $$;

commit;


