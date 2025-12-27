-- Add support for Double Elimination brackets
-- loser_next_match_id: where the loser drops
-- bracket_side: which part of the bracket this match belongs to

ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS loser_next_match_id UUID REFERENCES public.tournament_matches(id),
ADD COLUMN IF NOT EXISTS bracket_side TEXT CHECK (bracket_side IN ('winners', 'losers', 'final', 'reset')) DEFAULT 'winners';

-- Add index for loser progression
CREATE INDEX IF NOT EXISTS tournament_matches_loser_next_match_id_idx ON public.tournament_matches(loser_next_match_id);
