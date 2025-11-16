-- Allow team owners to update/decline and delete invitations
begin;

do $$ begin
  create policy ti_update_owner on public.team_invitations
  for update using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    or auth.role() = 'service_role'
  )
  with check (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy ti_delete_owner on public.team_invitations
  for delete using (
    exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;


