-- Cleanup stage_participants table
-- Issue: Table has both team_id and participant_id, and participant_id is NOT NULL causing insert errors.

DO $$
BEGIN
    -- 1. Migrate data if needed (copy participant_id to team_id if team_id is null)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'participant_id') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'team_id') THEN
        
        UPDATE public.stage_participants 
        SET team_id = participant_id 
        WHERE team_id IS NULL;
        
    END IF;

    -- 2. Drop the problematic participant_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'participant_id') THEN
        ALTER TABLE public.stage_participants DROP COLUMN participant_id;
    END IF;

    -- 3. Ensure team_id is NOT NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'team_id') THEN
        ALTER TABLE public.stage_participants ALTER COLUMN team_id SET NOT NULL;
    END IF;

END $$;
