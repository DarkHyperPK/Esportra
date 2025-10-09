-- Add all relevant columns to tournament_registrations
ALTER TABLE public.tournament_registrations
ADD COLUMN IF NOT EXISTS gamer_tag TEXT,
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'registered',
ADD COLUMN IF NOT EXISTS team_name TEXT,
ADD COLUMN IF NOT EXISTS team_members TEXT,
ADD COLUMN IF NOT EXISTS registration_type TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
