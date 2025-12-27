-- Update tournament_matches unique constraint to support Double Elimination
-- The previous constraint (tournament_id, round, match_number) was too restrictive
-- because Winners and Losers brackets share round/match numbers.

BEGIN;

-- 1. Drop the old constraint
ALTER TABLE public.tournament_matches
DROP CONSTRAINT IF EXISTS tournament_matches_unique_slot;

-- 2. Add the new constraint including bracket_side
ALTER TABLE public.tournament_matches
ADD CONSTRAINT tournament_matches_unique_side_slot 
UNIQUE (tournament_id, round, match_number, bracket_side);

-- 3. Ensure match_id (id column) is always generated if not provided
-- (The table already has 'id UUID DEFAULT uuid_generate_v4() PRIMARY KEY')
-- But we will also make sure 'match_id' as a column name is handled if it exists
-- Based on the error, it seems 'match_id' might be an alias or a specific column expected by some logic.
-- However, the schema shows 'id' is the primary key. 
-- If the error says "null value in column 'match_id'", it means there IS a column named 'match_id'.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tournament_matches' AND column_name = 'match_id') THEN
        ALTER TABLE public.tournament_matches ALTER COLUMN match_id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

COMMIT;
