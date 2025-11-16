-- Allow pending invitees to read the roster name so invitations can show proper labels
begin;

alter table if exists public.team_rosters enable row level security;

do $$ begin
  create policy trosters_select_invitee on public.team_rosters
  for select
  using (
    exists (
      select 1 from public.team_invitations ti
      where ti.roster_id = team_rosters.id
        and ti.status = 'pending'
        and (ti.invited_user_id = auth.uid()
             or ti.invited_email = (select email from public.profiles where id = auth.uid()))
    )
    or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

commit;


