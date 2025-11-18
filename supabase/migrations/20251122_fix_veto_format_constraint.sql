-- Fix veto_format constraint to allow bo1, bo3, bo5 formats
-- This migration updates the check constraint to include the new Valorant-specific formats

ALTER TABLE public.match_map_vetos
DROP CONSTRAINT IF EXISTS match_map_vetos_veto_format_check;

ALTER TABLE public.match_map_vetos
ADD CONSTRAINT match_map_vetos_veto_format_check CHECK (veto_format IN (
  'standard_7',      -- Legacy: Ban-Ban-Pick-Pick-Ban-Ban-Pick (7 maps)
  'standard_5',      -- Legacy: Ban-Ban-Pick-Pick-Ban (5 maps)
  'standard_9',      -- Legacy: Ban-Ban-Pick-Pick-Ban-Ban-Pick-Pick-Ban (9 maps)
  'bo1',             -- Valorant BO1: 5 bans, 1 pick, 1 side pick
  'bo3',             -- Valorant BO3: 2 bans, 2 picks+side, 2 bans, auto map 3, side pick
  'bo5'              -- Valorant BO5: 2 bans, 4 picks+side, auto map 5, side pick
));

