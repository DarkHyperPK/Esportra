-- Drop the redundant best_of column from tournament_matches table
-- Best of is stored per-stage in tournament_stages.config.bestOf

ALTER TABLE public.tournament_matches DROP COLUMN IF EXISTS best_of;

COMMENT ON COLUMN public.tournament_stages.config IS 'JSON config including bestOf, mapVeto settings. This is the source of truth for match settings.';
