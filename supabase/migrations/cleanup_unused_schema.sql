-- CLEANUP SCRIPT
-- Removes unused tables identified in the database analysis.

BEGIN;

-- 1. Drop unused legacy table (if it still exists)
DROP TABLE IF EXISTS public.tournament_registrations;

-- 2. Drop unused game-specific table
DROP TABLE IF EXISTS public.cs2_match_map_scores;

COMMIT;
