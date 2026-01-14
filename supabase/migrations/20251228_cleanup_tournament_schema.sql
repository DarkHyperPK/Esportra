-- Migration: Clean up tournament schema - remove redundant columns
-- Date: 2025-12-28
-- Description: 
-- 1. Remove format, bracket_type, bracket_format, playoff_size from tournaments table
-- 2. Add trigger to sync Stage 1 capacity with tournaments.max_teams

-- ============================================
-- STEP 1: Drop redundant columns from tournaments
-- ============================================

ALTER TABLE tournaments DROP COLUMN IF EXISTS format;
ALTER TABLE tournaments DROP COLUMN IF EXISTS bracket_type;
ALTER TABLE tournaments DROP COLUMN IF EXISTS bracket_format;
ALTER TABLE tournaments DROP COLUMN IF EXISTS playoff_size;

-- ============================================
-- STEP 2: Create function to sync Stage 1 capacity
-- ============================================

CREATE OR REPLACE FUNCTION sync_stage1_capacity()
RETURNS TRIGGER AS $$
BEGIN
    -- When max_teams is updated on tournaments, update Stage 1 capacity
    IF TG_OP = 'UPDATE' AND OLD.max_teams IS DISTINCT FROM NEW.max_teams THEN
        UPDATE tournament_stages
        SET capacity = NEW.max_teams
        WHERE tournament_id = NEW.id
          AND stage_order = 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Create trigger on tournaments table
-- ============================================

DROP TRIGGER IF EXISTS trigger_sync_stage1_capacity ON tournaments;

CREATE TRIGGER trigger_sync_stage1_capacity
    AFTER UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION sync_stage1_capacity();

-- ============================================
-- STEP 4: Create function to set initial Stage 1 capacity
-- ============================================

CREATE OR REPLACE FUNCTION set_stage1_initial_capacity()
RETURNS TRIGGER AS $$
BEGIN
    -- When Stage 1 is created, set capacity from tournament's max_teams
    IF NEW.stage_order = 1 AND NEW.capacity IS NULL THEN
        SELECT max_teams INTO NEW.capacity
        FROM tournaments
        WHERE id = NEW.tournament_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: Create trigger on tournament_stages table
-- ============================================

DROP TRIGGER IF EXISTS trigger_set_stage1_capacity ON tournament_stages;

CREATE TRIGGER trigger_set_stage1_capacity
    BEFORE INSERT ON tournament_stages
    FOR EACH ROW
    EXECUTE FUNCTION set_stage1_initial_capacity();

-- ============================================
-- STEP 6: Update existing Stage 1 records
-- ============================================

UPDATE tournament_stages ts
SET capacity = t.max_teams
FROM tournaments t
WHERE ts.tournament_id = t.id
  AND ts.stage_order = 1
  AND (ts.capacity IS NULL OR ts.capacity != t.max_teams);
