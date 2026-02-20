-- 20260220_add_map_name_to_match_games.sql
-- Add map_name column for denormalized display names in match history

BEGIN;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'brkt_match_games' 
    AND column_name = 'map_name'
  ) THEN
    ALTER TABLE public.brkt_match_games ADD COLUMN map_name text;
  END IF;
END $$;

COMMIT;
