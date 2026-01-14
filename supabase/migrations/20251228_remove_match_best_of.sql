-- Migration: Remove match-level best_of columns
-- Date: 2025-12-28
-- Description: 
-- 1. Sync tournament_stages.config.bestOf with config.veto.best_of
-- 2. Drop best_of column from tournament_matches
-- 3. Drop best_of column from match_map_vetos

-- ============================================
-- STEP 1: Fix Existing Stage Data
-- ============================================

-- Sync config.bestOf with veto.best_of where they differ or bestOf is missing
UPDATE tournament_stages
SET config = config || jsonb_build_object('bestOf', (config->'veto'->>'best_of')::int)
WHERE config->'veto'->>'best_of' IS NOT NULL
  AND (
    config->>'bestOf' IS NULL 
    OR (config->>'bestOf')::int != (config->'veto'->>'best_of')::int
  );

-- ============================================
-- STEP 2: Drop Columns
-- ============================================

ALTER TABLE tournament_matches DROP COLUMN IF EXISTS best_of;
ALTER TABLE match_map_vetos DROP COLUMN IF EXISTS best_of;
