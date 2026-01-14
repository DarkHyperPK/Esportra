-- Drop the redundant format column from tournaments table
-- Format is stored per-stage in tournament_stages.format and tournament_stages.config

ALTER TABLE public.tournaments DROP COLUMN IF EXISTS format;

COMMENT ON TABLE public.tournaments IS 'Tournament format is now stored per-stage in tournament_stages table';
