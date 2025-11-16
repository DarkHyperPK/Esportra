-- Allow captains to create notifications for invitees when sending team/roster invites
begin;

alter table if exists public.notifications enable row level security;

-- Create policy only if team_invitations exists (migration order safe)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'team_invitations'
  ) then
    begin
      create policy notify_invited_user on public.notifications
      for insert
      with check (
        exists (
          select 1 from public.team_invitations ti
          where ti.invited_user_id = notifications.user_id
            and ti.invited_by_user_id = auth.uid()
            and ti.status = 'pending'
        )
        or auth.role() = 'service_role'
      );
    exception when duplicate_object then null;
    end;
  end if;
end $$;

commit;


