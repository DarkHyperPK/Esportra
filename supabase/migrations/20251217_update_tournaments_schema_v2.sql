-- Add missing columns to tournaments table to match frontend wizard
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS format TEXT,
ADD COLUMN IF NOT EXISTS max_teams INTEGER,
ADD COLUMN IF NOT EXISTS min_teams INTEGER,
ADD COLUMN IF NOT EXISTS team_size INTEGER,
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS check_in_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS check_in_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_remove_unchecked BOOLEAN DEFAULT false;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer_id ON public.tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON public.tournaments(start_date);
