-- Add 'cancelled' and 'disputed' to tournament_matches status check constraint

BEGIN;

ALTER TABLE public.tournament_matches
DROP CONSTRAINT IF EXISTS tournament_matches_status_check;

ALTER TABLE public.tournament_matches
ADD CONSTRAINT tournament_matches_status_check
CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed', 'cancelled'));

COMMIT;
