-- Add best_of column to tournament_matches
ALTER TABLE public.tournament_matches 
ADD COLUMN IF NOT EXISTS best_of INTEGER DEFAULT 1;
