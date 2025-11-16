-- Reset SELECT policies on team_members to avoid recursion
begin;

alter table if exists public.team_members enable row level security;

-- Drop all existing SELECT policies on team_members (regardless of name)
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'team_members'
      and cmd in ('SELECT','ALL')
  loop
    execute format('drop policy if exists %I on public.team_members', r.policyname);
  end loop;
end $$;

-- Minimal, non-recursive policies
-- 1) A user can read their own membership rows (used to discover team_ids)
do $$ begin
  create policy tm_select_self on public.team_members
  for select using (
    user_id = auth.uid() or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- 2) Team owner can read all members of teams they own
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


