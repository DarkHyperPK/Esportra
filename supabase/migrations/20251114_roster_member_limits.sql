-- Enforce roster member limits: for 5v5 (team_size=5) allow up to 7 members; otherwise max equals team_size
begin;

create or replace function public.enforce_roster_member_limits()
returns trigger
language plpgsql
security definer
as $$
declare
  sz int;
  current_count int;
  max_allowed int;
begin
  select team_size into sz from public.team_rosters where id = new.roster_id;
  if sz is null then
    raise exception 'Roster not found';
  end if;

  select count(*) into current_count from public.team_roster_members
  where roster_id = new.roster_id;

  max_allowed := case when sz = 5 then 7 else sz end;

  if current_count + 1 > max_allowed then
    raise exception 'Roster member limit exceeded (max %).', max_allowed;
  end if;

  return new;
end;
$$;

do $$
begin
  drop trigger if exists trg_enforce_roster_member_limits on public.team_roster_members;
exception when undefined_table then null;
end $$;

do $$
begin
  create trigger trg_enforce_roster_member_limits
  before insert on public.team_roster_members
  for each row execute function public.enforce_roster_member_limits();
exception when undefined_table then null;
end $$;

commit;


