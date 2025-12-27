-- Create tournament matches table
CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    position INTEGER NOT NULL,
    participant1_id UUID REFERENCES public.tournament_registrations(id),
    participant2_id UUID REFERENCES public.tournament_registrations(id),
    winner_id UUID REFERENCES public.tournament_registrations(id),
    next_match_id UUID REFERENCES public.tournament_matches(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

-- Allow tournament organizers to manage their tournament matches
CREATE POLICY "Tournament organizers can manage their tournament matches"
    ON public.tournament_matches
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_matches.tournament_id
            AND t.user_id = auth.uid()
        )
    );

-- Allow participants to view their tournament matches
CREATE POLICY "Participants can view their tournament matches"
    ON public.tournament_matches
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.tournament_registrations tr
            WHERE tr.tournament_id = tournament_matches.tournament_id
            AND tr.user_id = auth.uid()
        )
    );

-- Add indexes for better performance
CREATE INDEX tournament_matches_tournament_id_idx ON public.tournament_matches(tournament_id);
CREATE INDEX tournament_matches_participant1_id_idx ON public.tournament_matches(participant1_id);
CREATE INDEX tournament_matches_participant2_id_idx ON public.tournament_matches(participant2_id);
CREATE INDEX tournament_matches_winner_id_idx ON public.tournament_matches(winner_id);
CREATE INDEX tournament_matches_next_match_id_idx ON public.tournament_matches(next_match_id); 