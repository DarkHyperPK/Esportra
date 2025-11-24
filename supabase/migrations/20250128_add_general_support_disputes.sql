-- Add support for general support disputes (non-tournament related)
-- Make tournament_id nullable so disputes can be general support requests

begin;

-- Make tournament_id nullable
-- This allows general support disputes (where tournament_id is NULL)
do $$
begin
  -- Check if column is already nullable
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournament_disputes'
      and column_name = 'tournament_id'
      and is_nullable = 'NO'
  ) then
    alter table public.tournament_disputes
    alter column tournament_id drop not null;
  end if;
end $$;

-- Update the foreign key constraint to allow NULL
-- PostgreSQL foreign keys allow NULL by default, but we'll ensure it's set up correctly
do $$
begin
  -- Drop existing constraint if it exists
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'tournament_disputes'
      and constraint_name = 'tournament_disputes_tournament_id_fkey'
  ) then
    alter table public.tournament_disputes
    drop constraint tournament_disputes_tournament_id_fkey;
  end if;
  
  -- Recreate constraint (NULL values are allowed by default in foreign keys)
  alter table public.tournament_disputes
  add constraint tournament_disputes_tournament_id_fkey
  foreign key (tournament_id) references public.tournaments(id) on delete cascade;
exception when others then
  -- If constraint already exists or other error, continue
  raise notice 'Constraint may already exist or error occurred: %', SQLERRM;
end $$;

-- Update RLS policy to allow users to see general support disputes (tournament_id IS NULL)
drop policy if exists td_select_participant_or_org on public.tournament_disputes;

create policy td_select_participant_or_org on public.tournament_disputes
for select
using (
  -- Users can see disputes they raised
  raised_by_user_id = auth.uid()
  -- Organizers can see disputes in their tournaments (only if tournament_id is not null)
  or (
    tournament_id is not null
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
  )
  -- Staff can see disputes in tournaments they assist (only if tournament_id is not null)
  -- Note: We use tournament_disputes.tournament_id directly to avoid recursion
  or (
    tournament_id is not null
    and exists (
      select 1 from public.tournament_staff ts
      where ts.tournament_id = tournament_disputes.tournament_id
        and ts.user_id = auth.uid()
        and ts.status = 'active'
        and 'disputes:assist' = any(ts.permissions)
    )
  )
  -- Super admin can VIEW all disputes (read-only for oversight)
  -- Moderator and ops_admin can VIEW and HANDLE disputes
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
  -- Also check admin_user_roles table for role-based access
  -- Use 'name' column which exists in both schemas
  or exists (
    select 1 from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    where aur.user_id = auth.uid()
      and lower(ar.name) in ('super_admin', 'moderator', 'ops_admin')
  )
  or auth.role() = 'service_role'
);

-- Update insert policy to allow general support disputes
drop policy if exists td_insert_self on public.tournament_disputes;

create policy td_insert_self on public.tournament_disputes
for insert
with check (
  -- Users can insert disputes they raise
  raised_by_user_id = auth.uid() 
  or auth.role() = 'service_role'
);

-- Update policy for admins to update disputes
drop policy if exists td_update_admin on public.tournament_disputes;

create policy td_update_admin on public.tournament_disputes
for update
using (
  -- Organizers can update disputes in their tournaments
  (
    tournament_id is not null
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
  )
  -- Staff with disputes:assist can update disputes in tournaments they assist
  or (
    tournament_id is not null
    and exists (
      select 1 from public.tournament_staff ts
      where ts.tournament_id = tournament_disputes.tournament_id
        and ts.user_id = auth.uid()
        and ts.status = 'active'
        and 'disputes:assist' = any(ts.permissions)
    )
  )
  -- Only moderator and ops_admin can HANDLE disputes (update/resolve)
  -- Super admin can only VIEW (read-only oversight)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
      and (
        'moderator' = any(p.admin_roles)
        or 'ops_admin' = any(p.admin_roles)
      )
  )
  -- Also check admin_user_roles table for role-based access
  -- Use 'name' column which exists in both schemas
  or exists (
    select 1 from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    where aur.user_id = auth.uid()
      and lower(ar.name) in ('moderator', 'ops_admin')
  )
  or auth.role() = 'service_role'
)
with check (
  -- Same conditions for updates
  (
    tournament_id is not null
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.organizer_id = auth.uid()
    )
  )
  or (
    tournament_id is not null
    and exists (
      select 1 from public.tournament_staff ts
      where ts.tournament_id = tournament_disputes.tournament_id
        and ts.user_id = auth.uid()
        and ts.status = 'active'
        and 'disputes:assist' = any(ts.permissions)
    )
  )
  -- Only moderator and ops_admin can update disputes
  -- Super admin can only VIEW (read-only oversight)
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
      and (
        'moderator' = any(p.admin_roles)
        or 'ops_admin' = any(p.admin_roles)
      )
  )
  -- Also check admin_user_roles table for role-based access
  -- Use 'name' column which exists in both schemas
  or exists (
    select 1 from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    where aur.user_id = auth.uid()
      and lower(ar.name) in ('moderator', 'ops_admin')
  )
  or auth.role() = 'service_role'
);

commit;

