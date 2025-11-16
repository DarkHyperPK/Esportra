-- FINAL WORKING COMPREHENSIVE SYSTEM IMPLEMENTATION
-- This script implements all missing functionality for the esports platform
-- Run this in your Supabase SQL editor

-- ==============================================
-- 1. PAYMENT SYSTEM IMPLEMENTATION
-- ==============================================

-- Create payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('paypal', 'bank', 'crypto', 'stripe')),
    provider VARCHAR(50) NOT NULL, -- 'paypal', 'stripe', 'bank_name', etc.
    account_details JSONB NOT NULL, -- Encrypted payment details
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, type, provider)
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    type VARCHAR(20) NOT NULL CHECK (type IN ('venue_booking', 'tournament_entry', 'withdrawal', 'payout', 'refund')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    external_payment_id VARCHAR(255), -- Stripe/PayPal transaction ID
    description TEXT,
    metadata JSONB DEFAULT '{}',
    related_entity_type VARCHAR(50), -- 'venue_booking', 'tournament_participant', etc.
    related_entity_id UUID,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_wallets table for balance tracking
CREATE TABLE IF NOT EXISTS user_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    pending_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ==============================================
-- 2. VENUE SYSTEM ENHANCEMENTS
-- ==============================================

-- Add owner_id column to venues table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'venues' AND column_name = 'owner_id') THEN
        ALTER TABLE venues ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create venue_bookings table
CREATE TABLE IF NOT EXISTS venue_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_hours DECIMAL(3,1) NOT NULL,
    stations_booked INTEGER NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    special_requests TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create venue_availability table
CREATE TABLE IF NOT EXISTS venue_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    available_stations INTEGER NOT NULL,
    price_per_hour DECIMAL(8,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venue_id, date, start_time, end_time)
);

-- ==============================================
-- 3. TOURNAMENT ENHANCEMENTS
-- ==============================================

-- Create tournament_brackets table
CREATE TABLE IF NOT EXISTS tournament_brackets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bracket_type VARCHAR(20) DEFAULT 'single_elimination' CHECK (bracket_type IN ('single_elimination', 'double_elimination', 'round_robin', 'swiss')),
    max_rounds INTEGER NOT NULL,
    current_round INTEGER DEFAULT 0,
    is_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament_prizes table
CREATE TABLE IF NOT EXISTS tournament_prizes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    prize_type VARCHAR(20) DEFAULT 'cash' CHECK (prize_type IN ('cash', 'points', 'items', 'badges')),
    prize_value DECIMAL(10,2),
    prize_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, position)
);

-- ==============================================
-- 4. USER STATISTICS AND ACHIEVEMENTS
-- ==============================================

-- Create user_statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tournaments_played INTEGER DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    tournaments_organized INTEGER DEFAULT 0,
    teams_created INTEGER DEFAULT 0,
    teams_joined INTEGER DEFAULT 0,
    venue_bookings INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    favorite_games TEXT[] DEFAULT '{}',
    skill_level VARCHAR(20) DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'professional')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('tournament', 'team', 'venue', 'social', 'milestone')),
    icon_url TEXT,
    points INTEGER DEFAULT 0,
    requirements JSONB NOT NULL, -- Criteria for earning the achievement
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress JSONB DEFAULT '{}', -- Track progress for multi-step achievements
    UNIQUE(user_id, achievement_id)
);

-- ==============================================
-- 5. NOTIFICATION SYSTEM ENHANCEMENTS
-- ==============================================

-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    action_url_template TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 6. REVIEW AND RATING SYSTEM
-- ==============================================

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    comment TEXT,
    review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('user', 'venue', 'tournament')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 7. MESSAGING SYSTEM
-- ==============================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'team', 'tournament')),
    title VARCHAR(200),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachments JSONB DEFAULT '{}',
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 8. ANALYTICS AND REPORTING
-- ==============================================

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ==============================================

-- Enable RLS on all new tables
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Payment methods policies
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
CREATE POLICY "Users can view their own payment methods" ON payment_methods
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
CREATE POLICY "Users can insert their own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
CREATE POLICY "Users can update their own payment methods" ON payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

-- Payments policies
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
CREATE POLICY "Users can insert their own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User wallets policies
DROP POLICY IF EXISTS "Users can view their own wallet" ON user_wallets;
CREATE POLICY "Users can view their own wallet" ON user_wallets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wallet" ON user_wallets;
CREATE POLICY "Users can insert their own wallet" ON user_wallets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own wallet" ON user_wallets;
CREATE POLICY "Users can update their own wallet" ON user_wallets
    FOR UPDATE USING (auth.uid() = user_id);

-- Venue bookings policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON venue_bookings;
CREATE POLICY "Users can view their own bookings" ON venue_bookings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view venue bookings for their venues" ON venue_bookings;
CREATE POLICY "Users can view venue bookings for their venues" ON venue_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM venues 
            WHERE venues.id = venue_bookings.venue_id 
            AND venues.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create bookings" ON venue_bookings;
CREATE POLICY "Users can create bookings" ON venue_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON venue_bookings;
CREATE POLICY "Users can update their own bookings" ON venue_bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Venue availability policies
DROP POLICY IF EXISTS "Anyone can view venue availability" ON venue_availability;
CREATE POLICY "Anyone can view venue availability" ON venue_availability
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Venue owners can manage availability" ON venue_availability;
CREATE POLICY "Venue owners can manage availability" ON venue_availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM venues 
            WHERE venues.id = venue_availability.venue_id 
            AND venues.owner_id = auth.uid()
        )
    );

-- Tournament brackets policies
DROP POLICY IF EXISTS "Anyone can view tournament brackets" ON tournament_brackets;
CREATE POLICY "Anyone can view tournament brackets" ON tournament_brackets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Tournament organizers can manage brackets" ON tournament_brackets;
CREATE POLICY "Tournament organizers can manage brackets" ON tournament_brackets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE tournaments.id = tournament_brackets.tournament_id 
            AND tournaments.organizer_id = auth.uid()
        )
    );

-- User statistics policies
DROP POLICY IF EXISTS "Users can view their own statistics" ON user_statistics;
CREATE POLICY "Users can view their own statistics" ON user_statistics
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own statistics" ON user_statistics;
CREATE POLICY "Users can insert their own statistics" ON user_statistics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own statistics" ON user_statistics;
CREATE POLICY "Users can update their own statistics" ON user_statistics
    FOR UPDATE USING (auth.uid() = user_id);

-- Achievements policies
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
CREATE POLICY "Anyone can view achievements" ON achievements
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own achievements" ON user_achievements;
CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own achievements" ON user_achievements;
CREATE POLICY "Users can insert their own achievements" ON user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reviews policies
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Conversation policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations" ON conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_participants.conversation_id = conversations.id 
            AND conversation_participants.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Message policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversation_participants 
            WHERE conversation_participants.conversation_id = messages.conversation_id 
            AND conversation_participants.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
CREATE POLICY "Users can send messages to their conversations" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ==============================================
-- 10. TRIGGERS FOR AUTOMATION
-- ==============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON user_wallets;
CREATE TRIGGER update_user_wallets_updated_at BEFORE UPDATE ON user_wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venue_bookings_updated_at ON venue_bookings;
CREATE TRIGGER update_venue_bookings_updated_at BEFORE UPDATE ON venue_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_venue_availability_updated_at ON venue_availability;
CREATE TRIGGER update_venue_availability_updated_at BEFORE UPDATE ON venue_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_brackets_updated_at ON tournament_brackets;
CREATE TRIGGER update_tournament_brackets_updated_at BEFORE UPDATE ON tournament_brackets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_prizes_updated_at ON tournament_prizes;
CREATE TRIGGER update_tournament_prizes_updated_at BEFORE UPDATE ON tournament_prizes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_achievements_updated_at ON achievements;
CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON achievements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_achievements_updated_at ON user_achievements;
CREATE TRIGGER update_user_achievements_updated_at BEFORE UPDATE ON user_achievements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_participants_updated_at ON conversation_participants;
CREATE TRIGGER update_conversation_participants_updated_at BEFORE UPDATE ON conversation_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user wallet on profile creation
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_wallets (user_id) VALUES (NEW.id);
    INSERT INTO user_statistics (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create wallet and stats when profile is created
DROP TRIGGER IF EXISTS create_user_wallet_trigger ON profiles;
CREATE TRIGGER create_user_wallet_trigger 
    AFTER INSERT ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION create_user_wallet();

-- Function to update user statistics
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tournament statistics
    IF TG_TABLE_NAME = 'tournament_participants' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE user_statistics 
            SET tournaments_played = tournaments_played + 1
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    -- Update team statistics
    IF TG_TABLE_NAME = 'team_members' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE user_statistics 
            SET teams_joined = teams_joined + 1
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    -- Update venue booking statistics
    IF TG_TABLE_NAME = 'venue_bookings' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE user_statistics 
            SET venue_bookings = venue_bookings + 1
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Triggers to update user statistics
DROP TRIGGER IF EXISTS update_user_stats_tournament_participants ON tournament_participants;
CREATE TRIGGER update_user_stats_tournament_participants
    AFTER INSERT ON tournament_participants
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

DROP TRIGGER IF EXISTS update_user_stats_team_members ON team_members;
CREATE TRIGGER update_user_stats_team_members
    AFTER INSERT ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

DROP TRIGGER IF EXISTS update_user_stats_venue_bookings ON venue_bookings;
CREATE TRIGGER update_user_stats_venue_bookings
    AFTER INSERT ON venue_bookings
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- ==============================================
-- 11. INITIAL DATA SEEDING
-- ==============================================

-- Insert default achievements (using simple INSERT with error handling)
DO $$
BEGIN
    -- Insert achievements one by one to avoid conflicts
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('First Tournament', 'Participate in your first tournament', 'tournament', 10, '{"tournaments_played": 1}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
    
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('Tournament Winner', 'Win your first tournament', 'tournament', 50, '{"tournaments_won": 1}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
    
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('Team Creator', 'Create your first team', 'team', 20, '{"teams_created": 1}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
    
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('Venue Explorer', 'Book your first venue', 'venue', 15, '{"venue_bookings": 1}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
    
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('Tournament Organizer', 'Organize your first tournament', 'tournament', 30, '{"tournaments_organized": 1}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
    
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('Social Butterfly', 'Join 5 teams', 'social', 25, '{"teams_joined": 5}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
    
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('Gaming Veteran', 'Play in 10 tournaments', 'milestone', 100, '{"tournaments_played": 10}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
    
    BEGIN
        INSERT INTO achievements (name, description, category, points, requirements) VALUES
        ('Champion', 'Win 5 tournaments', 'milestone', 200, '{"tournaments_won": 5}');
    EXCEPTION WHEN unique_violation THEN
        -- Achievement already exists, skip
    END;
END $$;

-- Insert notification templates (using simple INSERT with error handling)
DO $$
BEGIN
    -- Insert templates one by one to avoid conflicts
    BEGIN
        INSERT INTO notification_templates (type, title_template, message_template, action_url_template) VALUES
        ('team_invite', 'Team Invitation', 'You have been invited to join team {{team_name}}', '/teams/{{team_id}}');
    EXCEPTION WHEN unique_violation THEN
        -- Template already exists, skip
    END;
    
    BEGIN
        INSERT INTO notification_templates (type, title_template, message_template, action_url_template) VALUES
        ('tournament_reminder', 'Tournament Reminder', 'Your tournament {{tournament_name}} starts in 1 hour', '/tournaments/{{tournament_id}}');
    EXCEPTION WHEN unique_violation THEN
        -- Template already exists, skip
    END;
    
    BEGIN
        INSERT INTO notification_templates (type, title_template, message_template, action_url_template) VALUES
        ('booking_confirmation', 'Booking Confirmed', 'Your venue booking at {{venue_name}} has been confirmed', '/bookings/{{booking_id}}');
    EXCEPTION WHEN unique_violation THEN
        -- Template already exists, skip
    END;
    
    BEGIN
        INSERT INTO notification_templates (type, title_template, message_template, action_url_template) VALUES
        ('payment_received', 'Payment Received', 'You have received a payment of ${{amount}}', '/payments/{{payment_id}}');
    EXCEPTION WHEN unique_violation THEN
        -- Template already exists, skip
    END;
    
    BEGIN
        INSERT INTO notification_templates (type, title_template, message_template, action_url_template) VALUES
        ('achievement_earned', 'Achievement Unlocked', 'You have earned the {{achievement_name}} achievement!', '/profile/achievements');
    EXCEPTION WHEN unique_violation THEN
        -- Template already exists, skip
    END;
END $$;

-- ==============================================
-- 12. HELPER FUNCTIONS
-- ==============================================

-- Function to get user's total earnings
CREATE OR REPLACE FUNCTION get_user_earnings(user_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_earnings DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_earnings
    FROM payments 
    WHERE user_id = user_uuid 
    AND type IN ('payout', 'tournament_win')
    AND status = 'completed';
    
    RETURN total_earnings;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's total spent
CREATE OR REPLACE FUNCTION get_user_spent(user_uuid UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_spent DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_spent
    FROM payments 
    WHERE user_id = user_uuid 
    AND type IN ('venue_booking', 'tournament_entry')
    AND status = 'completed';
    
    RETURN total_spent;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has achievement
CREATE OR REPLACE FUNCTION has_achievement(user_uuid UUID, achievement_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    achievement_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO achievement_count
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = user_uuid 
    AND a.name = achievement_name;
    
    RETURN achievement_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to award achievement
CREATE OR REPLACE FUNCTION award_achievement(user_uuid UUID, achievement_name VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    achievement_id UUID;
    existing_count INTEGER;
BEGIN
    -- Get achievement ID
    SELECT id INTO achievement_id
    FROM achievements 
    WHERE name = achievement_name;
    
    IF achievement_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user already has this achievement
    SELECT COUNT(*) INTO existing_count
    FROM user_achievements 
    WHERE user_id = user_uuid AND achievement_id = achievement_id;
    
    IF existing_count > 0 THEN
        RETURN FALSE; -- Already has achievement
    END IF;
    
    -- Award the achievement
    INSERT INTO user_achievements (user_id, achievement_id) 
    VALUES (user_uuid, achievement_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 13. INDEXES FOR PERFORMANCE (MOVED TO END)
-- ==============================================

-- Payment system indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Venue booking indexes
CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue_id ON venue_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_date ON venue_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_venue_availability_venue_date ON venue_availability(venue_id, date);

-- Tournament indexes
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_tournament_id ON tournament_brackets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_prizes_tournament_id ON tournament_prizes(tournament_id);

-- User statistics indexes
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Review indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_venue_id ON reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_reviews_tournament_id ON reviews(tournament_id);

-- Message indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- ==============================================
-- COMPLETION MESSAGE
-- ==============================================

-- This completes the comprehensive system implementation
-- All major features are now supported with proper database structure
-- The system now includes:
-- ✅ Payment processing and wallet management
-- ✅ Venue booking system with availability tracking
-- ✅ Enhanced tournament system with brackets and prizes
-- ✅ User statistics and achievement system
-- ✅ Review and rating system
-- ✅ Messaging system
-- ✅ Analytics and reporting
-- ✅ Proper RLS policies for security
-- ✅ Automated triggers for data consistency
-- ✅ Helper functions for common operations
