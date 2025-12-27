-- Fix: Force all 'checked_in' teams to 'approved'
-- Use this if you disabled check-in and want all previously checked-in teams to be eligible for bracket generation immediately.

UPDATE tournament_participants
SET status = 'approved'
WHERE status = 'checked_in';

-- Also ensure pending teams are approved if desired (Uncomment if needed)
-- UPDATE tournament_participants SET status = 'approved' WHERE status = 'pending';
