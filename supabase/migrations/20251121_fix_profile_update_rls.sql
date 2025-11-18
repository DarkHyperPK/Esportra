-- Fix profile update RLS policy to ensure users can update their own profiles
-- This migration ensures the update policy works correctly

begin;

-- Drop existing update policies if they exist
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_policy" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

-- Create a simple, working update policy
-- Users can update their own profile
create policy "profiles_update_self" on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Service role can update any profile (for admin operations)
create policy "profiles_update_service_role" on public.profiles
  for update
  to service_role
  using (true)
  with check (true);

-- Ensure RLS is enabled
alter table if exists public.profiles enable row level security;

commit;

