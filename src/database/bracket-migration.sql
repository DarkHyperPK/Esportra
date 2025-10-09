-- Tournament Bracket System Database Migration
-- Run this in your Supabase SQL editor

-- Create tournament_matches table
CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  team1_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team1_score INTEGER DEFAULT NULL,
  team2_score INTEGER DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'disputed')),
  scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique match numbers per round
  UNIQUE(tournament_id, round, match_number)
);

-- Create match_results table for score reporting and verification
CREATE TABLE IF NOT EXISTS match_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team1_score INTEGER NOT NULL,
  team2_score INTEGER NOT NULL,
  screenshots TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verification_notes TEXT DEFAULT NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_screenshots storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('match-screenshots', 'match-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(tournament_id, round);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON match_results(status);
CREATE INDEX IF NOT EXISTS idx_match_results_reported_by ON match_results(reported_by);

-- Create unique partial index for one pending result per match
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_results_pending_unique 
ON match_results (match_id) 
WHERE status = 'pending';

-- Create updated_at trigger for tournament_matches
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tournament_matches_updated_at 
    BEFORE UPDATE ON tournament_matches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;

-- Tournament matches policies
CREATE POLICY "Anyone can view tournament matches" ON tournament_matches
    FOR SELECT USING (true);

CREATE POLICY "Organizers can manage tournament matches" ON tournament_matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_matches.tournament_id 
            AND tournaments.user_id = auth.uid()
        )
    );

-- Match results policies
CREATE POLICY "Anyone can view match results" ON match_results
    FOR SELECT USING (true);

CREATE POLICY "Team captains can report match results" ON match_results
    FOR INSERT WITH CHECK (
        auth.uid() = reported_by AND
        EXISTS (
            SELECT 1 FROM tournament_matches tm
            JOIN teams t1 ON tm.team1_id = t1.id
            JOIN teams t2 ON tm.team2_id = t2.id
            WHERE tm.id = match_results.match_id
            AND (
                EXISTS (SELECT 1 FROM team_members tm1 WHERE tm1.team_id = t1.id AND tm1.user_id = auth.uid() AND tm1.role = 'captain')
                OR
                EXISTS (SELECT 1 FROM team_members tm2 WHERE tm2.team_id = t2.id AND tm2.user_id = auth.uid() AND tm2.role = 'captain')
            )
        )
    );

CREATE POLICY "Organizers can verify match results" ON match_results
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tournament_matches tm
            JOIN tournaments t ON tm.tournament_id = t.id
            WHERE tm.id = match_results.match_id
            AND t.user_id = auth.uid()
        )
    );

-- Storage policies for match screenshots
CREATE POLICY "Anyone can view match screenshots" ON storage.objects
    FOR SELECT USING (bucket_id = 'match-screenshots');

CREATE POLICY "Authenticated users can upload match screenshots" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'match-screenshots' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own match screenshots" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'match-screenshots' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own match screenshots" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'match-screenshots' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Helper function to get tournament bracket
CREATE OR REPLACE FUNCTION get_tournament_bracket(tournament_uuid UUID)
RETURNS TABLE (
    match_id UUID,
    round INTEGER,
    match_number INTEGER,
    team1_id UUID,
    team2_id UUID,
    team1_name TEXT,
    team2_name TEXT,
    team1_tag TEXT,
    team2_tag TEXT,
    team1_logo_url TEXT,
    team2_logo_url TEXT,
    team1_score INTEGER,
    team2_score INTEGER,
    status TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    winner_id UUID,
    winner_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tm.id as match_id,
        tm.round,
        tm.match_number,
        tm.team1_id,
        tm.team2_id,
        t1.name as team1_name,
        t2.name as team2_name,
        t1.tag as team1_tag,
        t2.tag as team2_tag,
        t1.logo_url as team1_logo_url,
        t2.logo_url as team2_logo_url,
        tm.team1_score,
        tm.team2_score,
        tm.status,
        tm.scheduled_time,
        tm.winner_id,
        tw.name as winner_name
    FROM tournament_matches tm
    LEFT JOIN teams t1 ON tm.team1_id = t1.id
    LEFT JOIN teams t2 ON tm.team2_id = t2.id
    LEFT JOIN teams tw ON tm.winner_id = tw.id
    WHERE tm.tournament_id = tournament_uuid
    ORDER BY tm.round, tm.match_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to advance winner to next round
CREATE OR REPLACE FUNCTION advance_winner(match_uuid UUID)
RETURNS VOID AS $$
DECLARE
    current_match RECORD;
    next_round INTEGER;
    next_match_number INTEGER;
    winner_team_id UUID;
BEGIN
    -- Get current match details
    SELECT * INTO current_match 
    FROM tournament_matches 
    WHERE id = match_uuid;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Match not found';
    END IF;
    
    -- Get winner team ID
    winner_team_id := current_match.winner_id;
    
    -- Calculate next round and match number
    next_round := current_match.round + 1;
    next_match_number := CEIL(current_match.match_number / 2.0);
    
    -- Check if there's already a match in the next round for this position
    IF EXISTS (
        SELECT 1 FROM tournament_matches 
        WHERE tournament_id = current_match.tournament_id 
        AND round = next_round 
        AND match_number = next_match_number
    ) THEN
        -- Update existing match with winner
        UPDATE tournament_matches 
        SET 
            team1_id = CASE 
                WHEN match_number % 2 = 1 THEN winner_team_id 
                ELSE team1_id 
            END,
            team2_id = CASE 
                WHEN match_number % 2 = 0 THEN winner_team_id 
                ELSE team2_id 
            END
        WHERE tournament_id = current_match.tournament_id 
        AND round = next_round 
        AND match_number = next_match_number;
    ELSE
        -- Create new match in next round
        INSERT INTO tournament_matches (
            tournament_id, 
            round, 
            match_number, 
            team1_id, 
            team2_id, 
            status
        ) VALUES (
            current_match.tournament_id,
            next_round,
            next_match_number,
            CASE WHEN next_match_number % 2 = 1 THEN winner_team_id ELSE NULL END,
            CASE WHEN next_match_number % 2 = 0 THEN winner_team_id ELSE NULL END,
            'pending'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_tournament_bracket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION advance_winner(UUID) TO authenticated;
