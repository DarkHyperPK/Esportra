-- Unified Profile System Migration
-- This creates the database structure for a Fiverr-style unified profile system

-- Create player stats table
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tournaments_played INTEGER DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    teams_created INTEGER DEFAULT 0,
    teams_joined INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    favorite_games TEXT[] DEFAULT '{}',
    skill_level VARCHAR(20) DEFAULT 'beginner',
    preferred_team_size INTEGER DEFAULT 5,
    achievements TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create venue profiles table
CREATE TABLE IF NOT EXISTS venue_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    venue_name VARCHAR(255) NOT NULL,
    venue_logo TEXT,
    venue_type VARCHAR(100) NOT NULL,
    location TEXT NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    venue_description TEXT,
    venues_listed INTEGER DEFAULT 0,
    tournaments_hosted INTEGER DEFAULT 0,
    total_capacity INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create user reputation table
CREATE TABLE IF NOT EXISTS user_reputation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    overall_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    player_rating DECIMAL(3,2) DEFAULT 0,
    organizer_rating DECIMAL(3,2) DEFAULT 0,
    venue_rating DECIMAL(3,2) DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create user financials table
CREATE TABLE IF NOT EXISTS user_financials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    available_balance DECIMAL(10,2) DEFAULT 0,
    pending_payouts DECIMAL(10,2) DEFAULT 0,
    total_withdrawn DECIMAL(10,2) DEFAULT 0,
    player_earnings DECIMAL(10,2) DEFAULT 0,
    organizer_revenue DECIMAL(10,2) DEFAULT 0,
    venue_revenue DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create payout requests table
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_details JSONB,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user reviews table
CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    review_type VARCHAR(20) NOT NULL, -- 'player', 'organizer', 'venue_owner'
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    context_id UUID, -- tournament_id, team_id, venue_id, etc.
    context_type VARCHAR(50), -- 'tournament', 'team', 'venue', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user activity table
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    context_id UUID,
    context_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_user_id ON venue_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_user_financials_user_id ON user_financials(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON payout_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewee_id ON user_reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewer_id ON user_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(activity_type);

-- Create RLS policies
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Player stats policies
CREATE POLICY "Users can view their own player stats" ON player_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own player stats" ON player_stats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own player stats" ON player_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Venue profiles policies
CREATE POLICY "Users can view their own venue profiles" ON venue_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own venue profiles" ON venue_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own venue profiles" ON venue_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User reputation policies
CREATE POLICY "Users can view their own reputation" ON user_reputation
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reputation" ON user_reputation
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reputation" ON user_reputation
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User financials policies
CREATE POLICY "Users can view their own financials" ON user_financials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own financials" ON user_financials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financials" ON user_financials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payout requests policies
CREATE POLICY "Users can view their own payout requests" ON payout_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payout requests" ON payout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User reviews policies
CREATE POLICY "Users can view reviews about them" ON user_reviews
    FOR SELECT USING (auth.uid() = reviewee_id);

CREATE POLICY "Users can view reviews they wrote" ON user_reviews
    FOR SELECT USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can insert reviews" ON user_reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- User activity policies
CREATE POLICY "Users can view their own activity" ON user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity" ON user_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON player_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venue_profiles_updated_at BEFORE UPDATE ON venue_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON user_reputation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_financials_updated_at BEFORE UPDATE ON user_financials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at BEFORE UPDATE ON payout_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reviews_updated_at BEFORE UPDATE ON user_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to initialize user profile data
CREATE OR REPLACE FUNCTION initialize_user_profile(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Insert player stats
    INSERT INTO player_stats (user_id) VALUES (user_uuid) ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert user reputation
    INSERT INTO user_reputation (user_id) VALUES (user_uuid) ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert user financials
    INSERT INTO user_financials (user_id) VALUES (user_uuid) ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create function to update reputation
CREATE OR REPLACE FUNCTION update_user_reputation(user_uuid UUID, review_type VARCHAR, rating INTEGER)
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_reviews_count INTEGER;
    player_avg DECIMAL(3,2);
    organizer_avg DECIMAL(3,2);
    venue_avg DECIMAL(3,2);
BEGIN
    -- Get current averages
    SELECT AVG(rating)::DECIMAL(3,2), COUNT(*)
    INTO avg_rating, total_reviews_count
    FROM user_reviews 
    WHERE reviewee_id = user_uuid;
    
    -- Get type-specific averages
    SELECT AVG(rating)::DECIMAL(3,2) INTO player_avg
    FROM user_reviews 
    WHERE reviewee_id = user_uuid AND review_type = 'player';
    
    SELECT AVG(rating)::DECIMAL(3,2) INTO organizer_avg
    FROM user_reviews 
    WHERE reviewee_id = user_uuid AND review_type = 'organizer';
    
    SELECT AVG(rating)::DECIMAL(3,2) INTO venue_avg
    FROM user_reviews 
    WHERE reviewee_id = user_uuid AND review_type = 'venue_owner';
    
    -- Update reputation
    UPDATE user_reputation 
    SET 
        overall_rating = COALESCE(avg_rating, 0),
        total_reviews = total_reviews_count,
        player_rating = COALESCE(player_avg, 0),
        organizer_rating = COALESCE(organizer_avg, 0),
        venue_rating = COALESCE(venue_avg, 0),
        updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to update financials
CREATE OR REPLACE FUNCTION update_user_financials(user_uuid UUID, amount DECIMAL, earning_type VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE user_financials 
    SET 
        total_earnings = total_earnings + amount,
        available_balance = available_balance + amount,
        player_earnings = CASE WHEN earning_type = 'player' THEN player_earnings + amount ELSE player_earnings END,
        organizer_revenue = CASE WHEN earning_type = 'organizer' THEN organizer_revenue + amount ELSE organizer_revenue END,
        venue_revenue = CASE WHEN earning_type = 'venue' THEN venue_revenue + amount ELSE venue_revenue END,
        updated_at = NOW()
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_user_profile(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create trigger to update reputation when review is added
CREATE OR REPLACE FUNCTION handle_new_review()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_user_reputation(NEW.reviewee_id, NEW.review_type, NEW.rating);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_created
    AFTER INSERT ON user_reviews
    FOR EACH ROW EXECUTE FUNCTION handle_new_review();
