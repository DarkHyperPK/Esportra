-- Consolidate RLS policies for tournaments to fix 401 errors
begin;

-- Drop existing policies to clear conflicts/confusion
drop policy if exists "Tournaments are viewable by everyone" on public.tournaments;
drop policy if exists "Anyone can view public tournaments" on public.tournaments;
drop policy if exists "Organizers can view their own tournaments" on public.tournaments;
drop policy if exists "Organizers can create tournaments" on public.tournaments;
drop policy if exists "Organizers can update their own tournaments" on public.tournaments;
drop policy if exists "Organizers can delete their own tournaments" on public.tournaments;
drop policy if exists "tournaments_public_read" on public.tournaments;
drop policy if exists "tournaments_organizer_insert" on public.tournaments;
drop policy if exists "tournaments_organizer_update" on public.tournaments;
drop policy if exists "tournaments_organizer_delete" on public.tournaments;

-- Re-create clean policies
-- 1. Read: Public tournaments are visible to everyone (anon + auth). Organizer sees own non-public.
create policy "tournaments_select_policy" on public.tournaments for select
using (
  is_public = true
  or (auth.uid() = organizer_id)
  or auth.role() = 'service_role'
);

-- 2. Insert: Authenticated users can create (and becomes organizer)
create policy "tournaments_insert_policy" on public.tournaments for insert
with check (
  auth.role() = 'authenticated'
  and (organizer_id = auth.uid())
);

-- 3. Update: Organizer can update
create policy "tournaments_update_policy" on public.tournaments for update
using (
  (auth.uid() = organizer_id)
  or auth.role() = 'service_role'
);

-- 4. Delete: Organizer can delete
create policy "tournaments_delete_policy" on public.tournaments for delete
using (
  (auth.uid() = organizer_id)
  or auth.role() = 'service_role'
);

commit;
