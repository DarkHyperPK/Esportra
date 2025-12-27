-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    roles TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    game TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    venue TEXT NOT NULL,
    is_online BOOLEAN DEFAULT false,
    max_participants INTEGER NOT NULL,
    prize_pool TEXT NOT NULL,
    entry_fee TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament_registrations table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    registration_type TEXT NOT NULL,
    team_name TEXT,
    team_captain TEXT,
    team_email TEXT,
    team_phone TEXT,
    team_members TEXT,
    team_logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create venues table
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    games TEXT NOT NULL,
    hours TEXT NOT NULL,
    stations INTEGER NOT NULL,
    price_range TEXT,
    rating NUMERIC,
    image_url TEXT,
    open_now BOOLEAN,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create venue_bookings table
CREATE TABLE IF NOT EXISTS public.venue_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    hours INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'venue_owner', 'organizer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON public.tournaments(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_venues_user_id ON public.venues(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue_id ON public.venue_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for tournaments
CREATE POLICY "Tournaments are viewable by everyone" ON public.tournaments
    FOR SELECT USING (true);

CREATE POLICY "Users can create tournaments" ON public.tournaments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tournaments" ON public.tournaments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournaments" ON public.tournaments
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for tournament registrations
CREATE POLICY "Tournament registrations are viewable by everyone" ON public.tournament_registrations
    FOR SELECT USING (true);

CREATE POLICY "Users can create tournament registrations" ON public.tournament_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations" ON public.tournament_registrations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own registrations" ON public.tournament_registrations
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for venues
CREATE POLICY "Venues are viewable by everyone" ON public.venues
    FOR SELECT USING (true);

CREATE POLICY "Users can create venues" ON public.venues
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own venues" ON public.venues
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own venues" ON public.venues
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for venue bookings
CREATE POLICY "Venue bookings are viewable by venue owners and bookers" ON public.venue_bookings
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE id = venue_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create venue bookings" ON public.venue_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.venue_bookings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Venue owners can update bookings for their venues" ON public.venue_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.venues 
            WHERE id = venue_id AND user_id = auth.uid()
        )
    );

-- Create RLS policies for user roles
CREATE POLICY "User roles are viewable by admins" ON public.user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Only admins can manage user roles" ON public.user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to view their own roles
CREATE POLICY "view_own_roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to manage their own roles
CREATE POLICY "manage_own_roles"
ON public.user_roles
FOR ALL
USING (auth.uid() = user_id);

-- Allow authenticated users to view roles
CREATE POLICY "view_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true); 