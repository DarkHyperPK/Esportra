DO $$
DECLARE
    t_record RECORD;
    new_stage_id UUID;
    col_name TEXT;
    has_format BOOLEAN;
    has_sequence_order BOOLEAN;
    has_status BOOLEAN;
BEGIN
    -- 1. Ensure the table exists
    CREATE TABLE IF NOT EXISTS public.tournament_stages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'single_elimination',
        stage_order INTEGER NOT NULL DEFAULT 1,
        config JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- 2. Ensure our desired columns exist
    ALTER TABLE public.tournament_stages ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'single_elimination';
    ALTER TABLE public.tournament_stages ADD COLUMN IF NOT EXISTS stage_order INTEGER DEFAULT 1;
    ALTER TABLE public.tournament_stages ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

    -- 3. Handle "ghost" columns that might exist from previous iterations
    -- Check for sequence_order
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tournament_stages' AND column_name = 'sequence_order'
    ) INTO has_sequence_order;

    IF has_sequence_order THEN
        -- Make it nullable or give it a default to prevent NOT NULL violations
        ALTER TABLE public.tournament_stages ALTER COLUMN sequence_order DROP NOT NULL;
        ALTER TABLE public.tournament_stages ALTER COLUMN sequence_order SET DEFAULT 1;
    END IF;

    -- Check for status
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tournament_stages' AND column_name = 'status'
    ) INTO has_status;

    IF has_status THEN
        ALTER TABLE public.tournament_stages ALTER COLUMN status DROP NOT NULL;
        ALTER TABLE public.tournament_stages ALTER COLUMN status SET DEFAULT 'pending';
    END IF;

    -- 4. Determine which column name to use for order
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tournament_stages' AND column_name = 'stage_order'
    ) THEN
        col_name := 'stage_order';
    ELSE
        col_name := '"order"';
    END IF;

    -- 5. Check if format column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'tournament_stages' AND column_name = 'format'
    ) INTO has_format;

    -- 6. Iterate through all tournaments that don't have any stages yet
    FOR t_record IN 
        SELECT id, format FROM public.tournaments 
        WHERE id NOT IN (SELECT DISTINCT tournament_id FROM public.tournament_stages)
    LOOP
        -- Create a default "Main Stage" for the tournament
        IF has_format THEN
            EXECUTE format('INSERT INTO public.tournament_stages (tournament_id, name, format, %s)
            VALUES ($1, $2, $3, 1)
            RETURNING id', col_name)
            INTO new_stage_id
            USING t_record.id, 'Main Stage', COALESCE(t_record.format, 'single_elimination');
        ELSE
            EXECUTE format('INSERT INTO public.tournament_stages (tournament_id, name, %s)
            VALUES ($1, $2, 1)
            RETURNING id', col_name)
            INTO new_stage_id
            USING t_record.id, 'Main Stage';
        END IF;

        -- Link all existing matches for this tournament to the new stage
        UPDATE public.tournament_matches
        SET stage_id = new_stage_id
        WHERE tournament_id = t_record.id AND stage_id IS NULL;
    END LOOP;
END $$;
