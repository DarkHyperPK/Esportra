begin;

create or replace function public.get_team_roster(t_id uuid)
returns table(
  user_id uuid,
  username text,
  full_name text
)
language sql
security definer
set search_path = public
as $$
  select tm.user_id, p.username, p.full_name
  from public.team_members tm
  join public.profiles p on p.id = tm.user_id
  where tm.team_id = t_id and (tm.is_active is distinct from false);
$$;

revoke all on function public.get_team_roster(uuid) from public;
grant execute on function public.get_team_roster(uuid) to anon, authenticated, service_role;

commit;


