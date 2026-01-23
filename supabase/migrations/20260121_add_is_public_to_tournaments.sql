ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

-- Update existing rows to be public by default
UPDATE tournaments SET is_public = TRUE WHERE is_public IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tournaments_is_public ON tournaments(is_public);
