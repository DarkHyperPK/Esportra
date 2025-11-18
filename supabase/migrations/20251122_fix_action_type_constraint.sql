-- Fix action_type check constraint to allow pick_side and auto_pick
-- These are special action types used in the veto sequence

BEGIN;

-- Drop the existing check constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'match_map_veto_actions_action_type_check'
    ) THEN
        ALTER TABLE public.match_map_veto_actions 
        DROP CONSTRAINT match_map_veto_actions_action_type_check;
        RAISE NOTICE 'Dropped existing match_map_veto_actions_action_type_check constraint';
    ELSE
        RAISE NOTICE 'Constraint match_map_veto_actions_action_type_check does not exist';
    END IF;
END $$;

-- Add the new check constraint with all allowed action types
DO $$
BEGIN
    ALTER TABLE public.match_map_veto_actions
    ADD CONSTRAINT match_map_veto_actions_action_type_check
    CHECK (action_type IN ('ban', 'pick', 'pick_side', 'auto_pick'));
    RAISE NOTICE 'Added updated check constraint for match_map_veto_actions.action_type';
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
        WHERE conname = 'match_map_veto_actions_action_type_check'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Constraint match_map_veto_actions_action_type_check successfully updated';
    ELSE
        RAISE WARNING 'Constraint may not have been created properly';
    END IF;
END $$;

COMMIT;

