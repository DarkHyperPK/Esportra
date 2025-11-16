-- Ensure helper exists/updated to fetch team ids safely (no RLS recursion)
begin;

create or replace function public.current_user_team_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select team_id
  from public.team_members
  where user_id = auth.uid()
    and is_active = true
$$;

commit;


