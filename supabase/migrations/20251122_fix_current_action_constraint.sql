-- Fix current_action check constraint to allow pick_side and auto_pick
-- These are special action types used in the veto sequence

BEGIN;

-- Drop the existing check constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_map_vetos_current_action_check'
    ) THEN
        ALTER TABLE public.match_map_vetos 
        DROP CONSTRAINT match_map_vetos_current_action_check;
        RAISE NOTICE 'Dropped existing match_map_vetos_current_action_check constraint';
    ELSE
        RAISE NOTICE 'Constraint match_map_vetos_current_action_check does not exist';
    END IF;
END $$;

-- Add the new check constraint with all allowed action types
DO $$
BEGIN
    ALTER TABLE public.match_map_vetos
    ADD CONSTRAINT match_map_vetos_current_action_check
    CHECK (current_action IS NULL OR current_action IN ('ban', 'pick', 'pick_side', 'auto_pick'));
    RAISE NOTICE 'Added updated check constraint for match_map_vetos.current_action';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Constraint already exists';
END $$;

-- Verify the constraint was updated
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_map_vetos_current_action_check'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Constraint match_map_vetos_current_action_check successfully updated';
    ELSE
        RAISE WARNING 'Constraint may not have been created properly';
    END IF;
END $$;

COMMIT;

-- Note: After running this migration, current_action can be:
-- - NULL (when not in progress)
-- - 'ban' (when banning a map)
-- - 'pick' (when picking a map)
-- - 'pick_side' (when selecting attack/defend for a picked map)
-- - 'auto_pick' (when automatically picking the last remaining map)

