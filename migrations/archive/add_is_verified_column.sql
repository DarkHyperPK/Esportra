-- Add is_verified column to profiles table
-- This is needed for the team invite system to work properly

-- Add is_verified column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Update existing users to be verified by default (for testing purposes)
-- In production, you might want to set this based on actual verification status
UPDATE public.profiles 
SET is_verified = TRUE 
WHERE is_verified IS NULL OR is_verified = FALSE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified);
