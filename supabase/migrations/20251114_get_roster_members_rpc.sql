begin;

-- Drop existing function if it exists (to change return type)
drop function if exists public.get_roster_members(uuid);

-- Recreate function (profiles table only has username and full_name, not gamer_tag)
-- Frontend code handles gamer_tag fallback from username/full_name
-- Includes team owner even if not explicitly in roster_members
create function public.get_roster_members(r_id uuid)
returns table(
  user_id uuid,
  username text,
  full_name text
)
language sql
security definer
set search_path = public
as $$
  with roster_members as (
    select m.user_id, p.username, p.full_name
    from public.team_roster_members m
    join public.profiles p on p.id = m.user_id
    where m.roster_id = r_id and (m.is_active is distinct from false)
  ),
  team_owner as (
    select t.owner_id as user_id, p.username, p.full_name
    from public.team_rosters r
    join public.teams t on t.id = r.team_id
    join public.profiles p on p.id = t.owner_id
    where r.id = r_id
      and not exists (
        select 1 from public.team_roster_members m
        where m.roster_id = r_id and m.user_id = t.owner_id and (m.is_active is distinct from false)
      )
  )
  select user_id, username, full_name from roster_members
  union
  select user_id, username, full_name from team_owner;
$$;

revoke all on function public.get_roster_members(uuid) from public;
grant execute on function public.get_roster_members(uuid) to anon, authenticated, service_role;

commit;


