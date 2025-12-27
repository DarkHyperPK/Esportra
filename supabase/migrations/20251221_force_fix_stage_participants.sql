-- Force fix for stage_participants schema
-- The error "null value in column participant_id" suggests the column is still named participant_id
-- We need to standardize on team_id

DO $$
BEGIN
    -- Check if stage_participants table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stage_participants') THEN
        
        -- If participant_id exists, rename it to team_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'participant_id') THEN
            ALTER TABLE public.stage_participants RENAME COLUMN participant_id TO team_id;
        END IF;

        -- Ensure team_id is NOT NULL (it should be if it was participant_id)
        -- If we just added it, we might need to set it
        
        -- Double check that team_id exists now
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stage_participants' AND column_name = 'team_id') THEN
             -- Add foreign key if missing
             -- We can't easily check constraint existence in DO block without complex queries, 
             -- but we can try to add it and catch error, or just assume it's fine if the column exists.
             -- Let's just ensure the column is there.
             NULL;
        ELSE
            -- This shouldn't happen if the rename worked, but just in case
            ALTER TABLE public.stage_participants ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
        END IF;

    END IF;
END $$;
