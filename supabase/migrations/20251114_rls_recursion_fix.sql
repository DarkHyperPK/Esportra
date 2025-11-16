-- Break RLS recursion between teams <-> team_members
begin;

alter table if exists public.teams enable row level security;
alter table if exists public.team_members enable row level security;

-- Helper: check if current user owns the given team (SECURITY DEFINER bypasses RLS)
create or replace function public.is_team_owner(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.teams t
    where t.id = tid and t.owner_id = auth.uid()
  );
$$;

-- Recreate team_members owner policy using helper (no direct reference to teams)
do $$ begin
  drop policy if exists tm_select_owner_all on public.team_members;
exception when undefined_object then null; end $$;

do $$ begin
  create policy tm_select_owner_all on public.team_members
  for select using (
    public.is_team_owner(team_members.team_id) or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- Recreate teams visibility policy using helper current_user_team_ids() (no direct ref to team_members)
do $$ begin
  drop policy if exists teams_select_owner_or_member on public.teams;
exception when undefined_object then null; end $$;

do $$ begin
  create policy teams_select_owner_or_member on public.teams
  for select using (
    teams.owner_id = auth.uid()
    or teams.id = any (select public.current_user_team_ids())
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;


