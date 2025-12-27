-- Create tournament_stages table
CREATE TABLE IF NOT EXISTS public.tournament_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    stage_order INTEGER NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE public.tournament_stages ADD COLUMN IF NOT EXISTS format TEXT;
ALTER TABLE public.tournament_stages ADD COLUMN IF NOT EXISTS stage_order INTEGER;
ALTER TABLE public.tournament_stages ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- Add stage_id to tournament_matches
ALTER TABLE public.tournament_matches 
ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES public.tournament_stages(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.tournament_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tournament stages are viewable by everyone" 
ON public.tournament_stages FOR SELECT 
USING (true);

CREATE POLICY "Tournament stages are manageable by tournament organizers" 
ON public.tournament_stages FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id 
        AND (
            t.organizer_id = auth.uid()
            -- Add user_id check only if we are sure it exists, 
            -- but since organizer_id is the new standard, we'll prioritize it.
            -- To be safe and avoid the "column does not exist" error, 
            -- we'll stick to organizer_id which was added in the recent migration.
        )
    )
);

-- Updated at trigger
CREATE TRIGGER set_tournament_stages_updated_at
    BEFORE UPDATE ON public.tournament_stages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
