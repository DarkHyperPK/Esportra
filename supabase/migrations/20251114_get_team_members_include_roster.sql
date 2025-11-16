-- Expand get_team_members to include roster members even if team_members missing
begin;

create or replace function public.get_team_members(t_id uuid)
returns table (
  user_id uuid,
  username text,
  email text,
  avatar_url text,
  role text,
  joined_at timestamptz,
  is_active boolean
)
language sql
security definer
stable
set search_path = public
as $$
  with base as (
    select tm.user_id, p.username, p.email, p.avatar_url, tm.role::text as role, tm.joined_at, tm.is_active
    from public.team_members tm
    join public.profiles p on p.id = tm.user_id
    where tm.team_id = t_id
      and tm.is_active = true
  ),
  roster as (
    select m.user_id, p.username, p.email, p.avatar_url, coalesce(m.role, 'member')::text as role, m.created_at as joined_at, m.is_active
    from public.team_roster_members m
    join public.team_rosters r on r.id = m.roster_id
    join public.profiles p on p.id = m.user_id
    where r.team_id = t_id
      and m.is_active = true
  ),
  combined as (
    select * from base
    union all
    select * from roster
  )
  select distinct on (user_id)
         user_id, username, email, avatar_url, role,
         coalesce(joined_at, now()) as joined_at,
         true as is_active
  from combined
  order by user_id, joined_at desc;
$$;

commit;


