-- =====================================================
-- RENAME created_by COLUMNS TO owner_id
-- =====================================================

-- Rename created_by to owner_id in teams table
ALTER TABLE public.teams RENAME COLUMN created_by TO owner_id;

-- Rename created_by to owner_id in tournaments table  
ALTER TABLE public.tournaments RENAME COLUMN created_by TO owner_id;

-- Update indexes
DROP INDEX IF EXISTS idx_teams_created_by;
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);

DROP INDEX IF EXISTS idx_tournaments_created_by;
CREATE INDEX IF NOT EXISTS idx_tournaments_owner_id ON public.tournaments(owner_id);

SELECT 'Successfully renamed created_by columns to owner_id!' as message;
