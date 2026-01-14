-- Add loser_next_match_id column to tournament_matches
ALTER TABLE public.tournament_matches 
ADD COLUMN IF NOT EXISTS loser_next_match_id UUID REFERENCES public.tournament_matches(id);
