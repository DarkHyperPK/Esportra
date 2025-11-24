-- Restrict super_admin to VIEW-ONLY access for disputes
-- Only moderator and ops_admin can HANDLE disputes (comment, resolve, reject)
-- Super admin can VIEW all disputes for oversight but cannot actively handle them

begin;

-- Update dispute_comments SELECT policy to allow super_admin to VIEW all comments
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
      and (t.organizer_id = auth.uid() or td.assigned_to_user_id = auth.uid())
  )
  -- Staff can see ALL comments (including internal) on disputes in tournaments they assist
  or exists (
    select 1 from public.tournament_disputes td
    join public.tournament_staff ts on ts.tournament_id = td.tournament_id
    where td.id = dispute_id
      and ts.user_id = auth.uid()
      and ts.status = 'active'
      and 'disputes:assist' = any(ts.permissions)
  )
  -- Super admin, moderator, ops_admin can VIEW all comments (read-only for super_admin)
  -- This works for both tournament disputes and general support disputes
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
      and (
        p.is_admin = true
        or 'super_admin' = any(p.admin_roles)
        or 'moderator' = any(p.admin_roles)
        or 'ops_admin' = any(p.admin_roles)
      )
  )
  or exists (
    select 1 from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    where aur.user_id = auth.uid()
      and lower(ar.name) in ('super_admin', 'moderator', 'ops_admin')
  )
  or auth.role() = 'service_role'
);

-- Update dispute_comments INSERT policy to ONLY allow moderator and ops_admin to add comments
-- Super admin cannot add comments (view-only)
drop policy if exists dc_insert_own_or_organizer on public.dispute_comments;

create policy dc_insert_own_or_organizer on public.dispute_comments
for insert
with check (
  user_id = auth.uid()
  and (
    -- Users can insert comments on their own disputes
    exists (
      select 1 from public.tournament_disputes td
      where td.id = dispute_id and td.raised_by_user_id = auth.uid()
    )
    -- Organizers can insert comments on disputes in their tournaments
    or exists (
      select 1 from public.tournament_disputes td
      join public.tournaments t on t.id = td.tournament_id
      where td.id = dispute_id 
        and (t.organizer_id = auth.uid() or td.assigned_to_user_id = auth.uid())
    )
    -- Staff can insert comments on disputes in tournaments they assist
    or exists (
      select 1 from public.tournament_disputes td
      join public.tournament_staff ts on ts.tournament_id = td.tournament_id
      where td.id = dispute_id
        and ts.user_id = auth.uid()
        and ts.status = 'active'
        and 'disputes:assist' = any(ts.permissions)
    )
    -- ONLY moderator and ops_admin can insert comments (NOT super_admin)
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() 
        and (
          'moderator' = any(p.admin_roles)
          or 'ops_admin' = any(p.admin_roles)
        )
    )
    or exists (
      select 1 from public.admin_user_roles aur
      join public.admin_roles ar on ar.id = aur.role_id
      where aur.user_id = auth.uid()
        and lower(ar.name) in ('moderator', 'ops_admin')
    )
    or auth.role() = 'service_role'
  )
);

commit;

