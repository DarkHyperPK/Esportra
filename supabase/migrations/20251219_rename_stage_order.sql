-- Robust rename: only rename if "order" column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tournament_stages' 
        AND column_name = 'order'
    ) THEN
        ALTER TABLE public.tournament_stages RENAME COLUMN "order" TO stage_order;
    END IF;
END $$;
