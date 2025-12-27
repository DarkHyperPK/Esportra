-- Add soft delete support to tournaments, teams, and venues
-- Soft deleted items are hidden but can be restored within 7 days

-- Add deleted_at column to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add deleted_at column to venues
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tournaments_deleted_at ON public.tournaments(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_deleted_at ON public.teams(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venues_deleted_at ON public.venues(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to filter out soft-deleted records by default

-- Tournaments: Update select policy to exclude soft-deleted
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;
CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments
  FOR SELECT
  USING (deleted_at IS NULL OR auth.uid() = organizer_id);

-- Teams: Update select policy to exclude soft-deleted
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone" ON public.teams
  FOR SELECT
  USING (deleted_at IS NULL OR auth.uid() = owner_id);

-- Venues: Update select policy to exclude soft-deleted
DROP POLICY IF EXISTS "Venues are viewable by everyone" ON public.venues;
CREATE POLICY "Venues are viewable by everyone" ON public.venues
  FOR SELECT
  USING (deleted_at IS NULL OR auth.uid() = owner_id);

-- Add comments for documentation
COMMENT ON COLUMN public.tournaments.deleted_at IS 'Timestamp when tournament was soft deleted. NULL means not deleted. Items can be restored within 7 days.';
COMMENT ON COLUMN public.teams.deleted_at IS 'Timestamp when team was soft deleted. NULL means not deleted. Items can be restored within 7 days.';
COMMENT ON COLUMN public.venues.deleted_at IS 'Timestamp when venue was soft deleted. NULL means not deleted. Items can be restored within 7 days.';

-- Function to permanently delete old soft-deleted records (to be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_old_soft_deletes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  DELETE FROM public.tournaments
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '7 days';

  DELETE FROM public.teams
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '7 days';

  DELETE FROM public.venues
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < NOW() - INTERVAL '7 days';
    
  RAISE NOTICE 'Cleaned up soft-deleted records older than 7 days';
END;
$func$;

COMMENT ON FUNCTION cleanup_old_soft_deletes IS 'Permanently deletes tournaments, teams, and venues that have been soft-deleted for more than 7 days. Should be called by a scheduled job.';
