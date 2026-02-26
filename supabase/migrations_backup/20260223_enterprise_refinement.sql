-- Enterprise Schema Refinement Migration
-- 1. Normalization: Remove redundant organizer_id
-- 2. Data Contract: Create v_tournament_details view
-- 3. Enterprise Security: Cross-table RLS policies

BEGIN;

-- 1. DROP REDUNDANT COLUMN
-- Ensure all organization_ids are backfilled before dropping (Verified in previous step)
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS organizer_id;

-- 2. CREATE THE DATA CONTRACT (VIEW)
-- This view flattens the Tournament -> Organization -> Owner relationship
DROP VIEW IF EXISTS public.v_tournament_details CASCADE;
CREATE VIEW public.v_tournament_details AS
SELECT 
    t.*,
    (t.venue_id IS NULL) as is_online,
    o.name as organization_name,
    o.slug as organization_slug,
    o.logo_url as organization_logo,
    o.owner_id as organizer_owner_id,
    p.username as organizer_username,
    p.avatar_url as organizer_avatar,
    tm.name as winner_team_name,
    (SELECT count(*) FROM public.tournament_participants tp WHERE tp.tournament_id = t.id) as participant_count
FROM public.tournaments t
LEFT JOIN public.organizations o ON t.organization_id = o.id
LEFT JOIN public.profiles p ON o.owner_id = p.id
LEFT JOIN public.teams tm ON t.winner_id = tm.id;

-- Ensure the view is accessible
GRANT SELECT ON public.v_tournament_details TO anon, authenticated;

-- 3. UPGRADE RLS POLICIES (CROSS-TABLE SECURITY)
-- We need to check if the currentUser is the OWNER of the organization linked to the tournament

-- First, drop old policies that relied on direct organizer_id
DROP POLICY IF EXISTS "Organizers can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can update their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can delete their own tournaments" ON public.tournaments;

-- New Enterprise Policy: Insert
CREATE POLICY "Organizers can create tournaments" 
ON public.tournaments FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
);

-- New Enterprise Policy: Update
CREATE POLICY "Organizers can update their own tournaments" 
ON public.tournaments FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
);

-- New Enterprise Policy: Delete
CREATE POLICY "Organizers can delete their own tournaments" 
ON public.tournaments FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations 
    WHERE id = organization_id 
    AND owner_id = auth.uid()
  )
);

-- 4. HOUSEKEEPING (Indexes)
CREATE INDEX IF NOT EXISTS idx_tournaments_org_id ON public.tournaments(organization_id);

COMMIT;
