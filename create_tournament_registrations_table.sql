-- =====================================================
-- CREATE TOURNAMENT_REGISTRATIONS TABLE
-- =====================================================
-- This table stores detailed tournament registration information

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    registration_type TEXT NOT NULL CHECK (registration_type IN ('individual', 'team')),
    gamer_tag TEXT,
    team_name TEXT,
    team_captain TEXT,
    team_members TEXT, -- Comma-separated list of team members
    team_logo TEXT,
    user_email TEXT,
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'cancelled', 'disqualified')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique registration per user per tournament
    UNIQUE(tournament_id, user_id),
    
    -- Ensure team registration is unique per tournament
    UNIQUE(tournament_id, team_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team_id ON public.tournament_registrations(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_status ON public.tournament_registrations(status);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_created_at ON public.tournament_registrations(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own registrations" ON public.tournament_registrations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own registrations" ON public.tournament_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations" ON public.tournament_registrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Tournament organizers can view all registrations for their tournaments" ON public.tournament_registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tournaments 
            WHERE tournaments.id = tournament_registrations.tournament_id 
            AND tournaments.owner_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all registrations" ON public.tournament_registrations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_tournament_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tournament_registrations_updated_at
    BEFORE UPDATE ON public.tournament_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_registrations_updated_at();

-- Success message
SELECT '✅ tournament_registrations table created successfully!' as message;
SELECT '✅ Indexes created for performance' as status;
SELECT '✅ RLS policies configured for security' as security;
SELECT '✅ Ready for frontend tournament registration system' as next_step;
