-- Add enhancements to tournament_stages
ALTER TABLE public.tournament_stages 
ADD COLUMN IF NOT EXISTS capacity INTEGER,
ADD COLUMN IF NOT EXISTS advancement_count INTEGER,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed')),
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Create stage_participants table
CREATE TABLE IF NOT EXISTS public.stage_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES public.tournament_stages(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(stage_id, team_id)
);

-- Enable RLS for stage_participants
ALTER TABLE public.stage_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stage_participants
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Stage participants are viewable by everyone'
    ) THEN
        CREATE POLICY "Stage participants are viewable by everyone" 
        ON public.stage_participants FOR SELECT 
        USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Stage participants are manageable by tournament organizers'
    ) THEN
        CREATE POLICY "Stage participants are manageable by tournament organizers" 
        ON public.stage_participants FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM public.tournament_stages s
                JOIN public.tournaments t ON t.id = s.tournament_id
                WHERE s.id = stage_id 
                AND t.organizer_id = auth.uid()
            )
        );
    END IF;
END $$;
