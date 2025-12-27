-- Fix stage_participants schema if it has incorrect column names
DO $$
BEGIN
    -- Check if stage_participants table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stage_participants') THEN
        
        -- Check if team_id column exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'team_id') THEN
             
             -- If participant_id exists, rename it to team_id
             IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'participant_id') THEN
                 ALTER TABLE public.stage_participants RENAME COLUMN participant_id TO team_id;
             ELSE
                 -- Otherwise add team_id column (nullable first to avoid errors with existing rows)
                 ALTER TABLE public.stage_participants ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
             END IF;
        END IF;

    END IF;
END $$;
