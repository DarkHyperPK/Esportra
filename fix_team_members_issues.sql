-- Fix team members issues
-- This script ensures all team captains are properly added to team_members table
-- and fixes any missing member data

-- First, let's see what teams exist and their captains
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.owner_id as captain_id,
  p.username as captain_username,
  COUNT(tm.id) as member_count
FROM teams t
LEFT JOIN profiles p ON t.owner_id = p.id
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.owner_id, p.username
ORDER BY t.name;

-- Add missing captains to team_members table
INSERT INTO team_members (team_id, user_id, role, is_active, joined_at)
SELECT 
  t.id as team_id,
  t.owner_id as user_id,
  'captain' as role,
  true as is_active,
  t.created_at as joined_at
FROM teams t
WHERE t.is_active = true
  AND t.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = t.id 
      AND tm.user_id = t.owner_id
      AND tm.is_active = true
  );

-- Update any existing captain records to have the correct role
UPDATE team_members 
SET role = 'captain'
WHERE team_id IN (
  SELECT t.id FROM teams t 
  WHERE t.owner_id = team_members.user_id
    AND t.is_active = true
)
AND role != 'captain';

-- Ensure all team members have is_active = true and joined_at set
UPDATE team_members 
SET 
  is_active = true,
  joined_at = COALESCE(joined_at, created_at, NOW())
WHERE is_active IS NULL OR joined_at IS NULL;

-- Show final team member counts
SELECT 
  t.id as team_id,
  t.name as team_name,
  t.owner_id as captain_id,
  p.username as captain_username,
  COUNT(tm.id) as total_members,
  COUNT(CASE WHEN tm.role = 'captain' THEN 1 END) as captains,
  COUNT(CASE WHEN tm.role = 'member' THEN 1 END) as members
FROM teams t
LEFT JOIN profiles p ON t.owner_id = p.id
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = true
WHERE t.is_active = true
GROUP BY t.id, t.name, t.owner_id, p.username
ORDER BY t.name;
