-- Add match_count column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS match_count INTEGER DEFAULT 1;

-- Add comment
COMMENT ON COLUMN public.tournaments.match_count IS 'Number of matches to be played (specifically for Battle Royale formats)';
