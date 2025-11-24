-- Fix RLS policy for dispute_comments
-- Disputes are user-independent: users can see comments on disputes they raised
-- Organizers and staff with proper permissions can manage disputes in their tournaments

begin;

-- Drop and recreate the select policy
drop policy if exists dc_select_own_or_dispute on public.dispute_comments;

create policy dc_select_own_or_dispute on public.dispute_comments
for select
using (
  -- Users can see their own comments
  user_id = auth.uid()
  -- Users can see non-internal comments on disputes they raised
  or (
    not is_internal
    and exists (
      select 1 from public.tournament_disputes td
      where td.id = dispute_id and td.raised_by_user_id = auth.uid()
    )
  )
  -- Organizers can see ALL comments (including internal) on disputes in their tournaments
  or exists (
    select 1 from public.tournament_disputes td
    join public.tournaments t on t.id = td.tournament_id
    where td.id = dispute_id 
      and t.organizer_id = auth.uid()
  )
  -- Assigned staff/organizers can see ALL comments on disputes assigned to them
  or exists (
    select 1 from public.tournament_disputes td
    where td.id = dispute_id 
      and td.assigned_to_user_id = auth.uid()
  )
  -- Staff with disputes:assist permission can see ALL comments (including internal) on disputes in tournaments they assist
  or exists (
    select 1 from public.tournament_disputes td
    join public.tournament_staff ts on ts.tournament_id = td.tournament_id
    where td.id = dispute_id
      and ts.user_id = auth.uid()
      and ts.status = 'active'
      and 'disputes:assist' = any(ts.permissions)
  )
  or auth.role() = 'service_role'
);

commit;
