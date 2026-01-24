-- Fix for 42804 type mismatch error in get_team_members
-- The error "Returned type team_member_role does not match expected type text" occurs because
-- we were selecting an enum type into a text column without casting.

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
language plpgsql
security definer
set search_path = public
as $$
begin
  -- security check: only allow if caller is owner or member
  if exists (select 1 from public.teams t where t.id = t_id and t.owner_id = auth.uid())
     or exists (select 1 from public.team_members tm where tm.team_id = t_id and tm.user_id = auth.uid() and tm.is_active = true)
  then
    return query
      select 
        p.id as user_id, 
        p.username, 
        p.email, 
        p.avatar_url, 
        tm.role::text, 
        tm.joined_at, 
        tm.is_active
      from public.team_members tm
      join public.profiles p on p.id = tm.user_id
      where tm.team_id = t_id
        and tm.is_active = true;
  else
    -- Return empty set if not authorized
    return;
  end if;
end;
$$;

commit;
