-- Drop and recreate get_team_members with expanded return type
begin;

-- Drop existing function if present (old signature)
do $$ begin
  drop function if exists public.get_team_members(uuid);
exception when undefined_function then null; end $$;

-- Recreate with new row type
create function public.get_team_members(t_id uuid)
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
  -- Only allow if caller is team owner or active member
  if exists (select 1 from public.teams t where t.id = t_id and t.owner_id = auth.uid())
     or exists (select 1 from public.team_members tm where tm.team_id = t_id and tm.user_id = auth.uid() and tm.is_active = true)
  then
    return query
      select p.id, p.username, p.email, p.avatar_url, tm.role, tm.joined_at, tm.is_active
      from public.team_members tm
      join public.profiles p on p.id = tm.user_id
      where tm.team_id = t_id
        and tm.is_active = true;
  else
    return;
  end if;
end;
$$;

commit;


