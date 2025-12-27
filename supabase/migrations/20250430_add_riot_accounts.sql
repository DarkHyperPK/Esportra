-- Drop Riot-related tables and columns
DROP TABLE IF EXISTS public.riot_accounts;

-- Remove Riot-related columns from tournament_registrations
ALTER TABLE public.tournament_registrations 
DROP COLUMN IF EXISTS gamer_tag,
DROP COLUMN IF EXISTS riot_puuid,
DROP COLUMN IF EXISTS riot_game_name,
DROP COLUMN IF EXISTS riot_tag_line,
DROP COLUMN IF EXISTS riot_rank,
DROP COLUMN IF EXISTS riot_tier;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON public.tournament_registrations(user_id);
