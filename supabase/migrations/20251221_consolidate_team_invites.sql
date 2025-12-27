-- Migration: Consolidate team_invites into team_invitations
-- Description: Merges the legacy team_invites table into the newer team_invitations table and drops the legacy one.

BEGIN;

-- 1. Ensure team_invitations has all necessary columns from team_invites
DO $$ 
BEGIN 
    -- Add invited_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_invitations' AND column_name = 'invited_by') THEN
        ALTER TABLE public.team_invitations ADD COLUMN invited_by uuid REFERENCES auth.users(id);
    END IF;

    -- Add message if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_invitations' AND column_name = 'message') THEN
        ALTER TABLE public.team_invitations ADD COLUMN message text;
    END IF;

    -- Add responded_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_invitations' AND column_name = 'responded_at') THEN
        ALTER TABLE public.team_invitations ADD COLUMN responded_at timestamptz;
    END IF;
END $$;

-- 2. Migrate data from team_invites to team_invitations
-- We map user_id -> invited_user_id
INSERT INTO public.team_invitations (
    team_id,
    invited_user_id,
    invited_by,
    status,
    message,
    created_at,
    responded_at
)
SELECT 
    ti.team_id,
    ti.user_id,
    ti.invited_by,
    ti.status,
    ti.message,
    ti.created_at,
    ti.responded_at
FROM 
    public.team_invites ti
WHERE 
    NOT EXISTS (
        SELECT 1 FROM public.team_invitations existing 
        WHERE existing.team_id = ti.team_id 
        AND existing.invited_user_id = ti.user_id
    );

-- 3. Drop the legacy table
DROP TABLE IF EXISTS public.team_invites;

COMMIT;
