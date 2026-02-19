-- Fix Notification RLS Policies
-- The existing policies were incomplete, missing SELECT and DELETE permissions,
-- and blocking team invite responses.

begin;

-- 1. Allow users to VIEW their own notifications
create policy "Users can view their own notifications"
on public.notifications for select
using (auth.uid() = user_id);

-- 2. Allow users to DELETE their own notifications
create policy "Users can delete their own notifications"
on public.notifications for delete
using (auth.uid() = user_id);

-- 3. Allow invitees to notify inviters (Team Invite Response)
create policy "notify_inviter_on_response"
on public.notifications for insert
with check (
  exists (
    select 1 from public.team_invitations ti
    where ti.invited_by_user_id = notifications.user_id -- Target is the inviter
      and ti.invited_user_id = auth.uid()               -- Sender is the invitee
  )
);

commit;
