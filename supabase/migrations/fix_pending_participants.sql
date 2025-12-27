-- Approve all pending participants
-- This is a utility script to help users who manually added teams but didn't approve them.

-- 1. Check count of pending participants
SELECT count(*) as pending_count FROM tournament_participants WHERE status = 'pending';

-- 2. Update them to approved (Uncomment to execute)
UPDATE tournament_participants 
SET status = 'approved' 
WHERE status = 'pending';

-- 3. Verify
SELECT count(*) as approved_count FROM tournament_participants WHERE status = 'approved';
