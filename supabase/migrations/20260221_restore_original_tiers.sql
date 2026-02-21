-- Migrate existing rows back to original tiers in case any were created during the transition
UPDATE sponsors 
SET tier = 'radiant' WHERE tier = 'platinum';
UPDATE sponsors 
SET tier = 'ascendant' WHERE tier = 'gold';
UPDATE sponsors 
SET tier = 'diamond' WHERE tier = 'standard';

UPDATE partner_applications 
SET partnership_tier = 'radiant' WHERE partnership_tier = 'platinum';
UPDATE partner_applications 
SET partnership_tier = 'ascendant' WHERE partnership_tier = 'gold';
UPDATE partner_applications 
SET partnership_tier = 'diamond' WHERE partnership_tier = 'standard';

-- Drop the old CHECK constraints that were restricting to platinum/gold/standard
ALTER TABLE partner_applications DROP CONSTRAINT IF EXISTS partner_applications_partnership_tier_check;
ALTER TABLE sponsors DROP CONSTRAINT IF EXISTS sponsors_tier_check;

-- Restore the correct CHECK constraints for the original tier names
ALTER TABLE partner_applications ADD CONSTRAINT partner_applications_partnership_tier_check CHECK (partnership_tier IN ('radiant', 'ascendant', 'diamond', 'standard'));
ALTER TABLE sponsors ADD CONSTRAINT sponsors_tier_check CHECK (tier IN ('radiant', 'ascendant', 'diamond', 'standard'));
