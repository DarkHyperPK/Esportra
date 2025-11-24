-- Fix audit_logs RLS policy to allow super_admin, moderator, and ops_admin to view all audit logs
-- Super admin needs full visibility into all activity logs for oversight

begin;

-- Drop existing policies if they exist
drop policy if exists audit_admin_select on public.audit_logs;
drop policy if exists "Admins can view all audit logs" on public.audit_logs;
drop policy if exists audit_logs_select_policy on public.audit_logs;

-- Create new SELECT policy that allows all admin roles to view audit logs
create policy audit_logs_select_admin_roles on public.audit_logs
for select
using (
  -- Check profiles.is_admin flag
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
      and p.is_admin = true
  )
  -- Check profiles.admin_roles array
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
      and (
        'super_admin' = any(p.admin_roles)
        or 'moderator' = any(p.admin_roles)
        or 'ops_admin' = any(p.admin_roles)
      )
  )
  -- Check admin_user_roles table
  -- Use 'name' column which exists in both schemas
  -- When 'key' column exists, it's the identifier, but 'name' also contains the role name
  -- When 'key' doesn't exist, 'name' is used as the identifier
  or exists (
    select 1 from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    where aur.user_id = auth.uid()
      and lower(ar.name) in ('super_admin', 'moderator', 'ops_admin')
  )
  or auth.role() = 'service_role'
);

-- Drop existing INSERT policies if they exist
drop policy if exists audit_admin_insert on public.audit_logs;
drop policy if exists "Admins can insert audit logs" on public.audit_logs;
drop policy if exists audit_logs_insert_policy on public.audit_logs;

-- Create new INSERT policy that allows all admin roles to insert audit logs
create policy audit_logs_insert_admin_roles on public.audit_logs
for insert
with check (
  -- Check profiles.is_admin flag
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
      and p.is_admin = true
  )
  -- Check profiles.admin_roles array
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() 
      and (
        'super_admin' = any(p.admin_roles)
        or 'moderator' = any(p.admin_roles)
        or 'ops_admin' = any(p.admin_roles)
      )
  )
  -- Check admin_user_roles table
  -- Use 'name' column which exists in both schemas
  -- When 'key' column exists, it's the identifier, but 'name' also contains the role name
  -- When 'key' doesn't exist, 'name' is used as the identifier
  or exists (
    select 1 from public.admin_user_roles aur
    join public.admin_roles ar on ar.id = aur.role_id
    where aur.user_id = auth.uid()
      and lower(ar.name) in ('super_admin', 'moderator', 'ops_admin')
  )
  or auth.role() = 'service_role'
);

commit;

