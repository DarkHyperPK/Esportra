-- Allow owners and active members to read their teams (for menus/loaders)
begin;

alter table if exists public.teams enable row level security;

do $$ begin
  create policy teams_select_owner_or_member on public.teams
  for select using (
    -- Owner can read their team
    owner_id = auth.uid()
    -- Any active member can read the team they belong to
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id
        and tm.user_id = auth.uid()
        and tm.is_active = true
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;


