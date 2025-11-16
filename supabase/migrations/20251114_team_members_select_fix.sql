-- Fix recursive RLS on team_members by using non-recursive policies
begin;

alter table if exists public.team_members enable row level security;

-- Drop the previous policy if it exists
do $$ begin
  drop policy if exists tm_select_same_team on public.team_members;
exception when undefined_object then null; end $$;

-- Allow a user to read their own membership rows (used to discover team_ids)
do $$ begin
  create policy tm_select_self on public.team_members
  for select using (
    user_id = auth.uid() or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- Allow team owners to read all members of their teams (no recursion)
do $$ begin
  create policy tm_select_owner_all on public.team_members
  for select using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id
        and t.owner_id = auth.uid()
    ) or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;


