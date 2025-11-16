-- Allow teammates to see each other (team_members + profiles)
begin;

-- Ensure RLS is on
alter table if exists public.team_members enable row level security;
alter table if exists public.profiles enable row level security;

-- Helper: return team_ids the current user is an active member of (SECURITY DEFINER to avoid recursion)
create or replace function public.current_user_team_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select team_id
  from public.team_members
  where user_id = auth.uid()
    and is_active = true
$$;

-- Drop previous policies if present
do $$ begin
  drop policy if exists tm_select_same_team on public.team_members;
exception when undefined_object then null; end $$;

do $$ begin
  drop policy if exists profiles_select_teammates on public.profiles;
exception when undefined_object then null; end $$;

-- team_members: any active member (or owner) can read all members of the same team
do $$ begin
  create policy tm_select_same_team on public.team_members
  for select using (
    team_members.team_id = any (select public.current_user_team_ids())
    or exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.owner_id = auth.uid()
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- profiles: allow reading basic info for your teammates
do $$ begin
  create policy profiles_select_teammates on public.profiles
  for select using (
    exists (
      select 1
      from public.team_members a
      where a.user_id = public.profiles.id
        and a.is_active = true
        and a.team_id = any (select public.current_user_team_ids())
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;


