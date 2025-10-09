-- Add status column to tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming'; 