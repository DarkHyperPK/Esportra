-- Enhance teams table with additional columns for better team management
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS games JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS social_media JSONB,
ADD COLUMN IF NOT EXISTS achievements JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add joined_at column to team_members for role-specific data
ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for enhanced security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Allow users to view teams they are members of or are public
CREATE POLICY "Users can view teams they are members of" ON public.teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_id = teams.id AND user_id = auth.uid()
        ) OR created_by = auth.uid()
    );

-- Allow team creators to update their teams
CREATE POLICY "Team creators can update their teams" ON public.teams
    FOR UPDATE USING (created_by = auth.uid());

-- Allow authenticated users to create teams
CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow team creators to delete their teams
CREATE POLICY "Team creators can delete their teams" ON public.teams
    FOR DELETE USING (created_by = auth.uid());

-- Enhanced team_members RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view team members of teams they belong to
CREATE POLICY "Users can view team members of their teams" ON public.team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()
        )
    );

-- Allow team captains to manage team members
CREATE POLICY "Team captains can manage team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'captain'
        )
    );

-- Allow users to update their own team membership
CREATE POLICY "Users can update their own team membership" ON public.team_members
    FOR UPDATE USING (user_id = auth.uid());

-- Allow team captains to insert new members
CREATE POLICY "Team captains can add members" ON public.team_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
            AND tm.role = 'captain'
        )
    );
