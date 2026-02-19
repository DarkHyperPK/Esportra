-- Migration: Create match_disputes table for dispute system
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.match_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.brkt_matches(id) ON DELETE CASCADE,
    disputed_by_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    disputed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for quick lookup by match
CREATE INDEX IF NOT EXISTS idx_match_disputes_match_id ON public.match_disputes(match_id);

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_match_disputes_status ON public.match_disputes(status);

-- Enable RLS
ALTER TABLE public.match_disputes ENABLE ROW LEVEL SECURITY;

-- Teams can view disputes for their own matches
CREATE POLICY "Teams can view their match disputes" ON public.match_disputes
    FOR SELECT USING (
        disputed_by_team_id IN (
            SELECT id FROM public.teams WHERE captain_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.brkt_matches m
            WHERE m.id = match_disputes.match_id
            AND (m.team1_id = disputed_by_team_id OR m.team2_id = disputed_by_team_id)
        )
    );

-- Team captains can create disputes
CREATE POLICY "Captains can create disputes" ON public.match_disputes
    FOR INSERT WITH CHECK (
        disputed_by_user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.teams t
            WHERE t.id = disputed_by_team_id AND t.captain_id = auth.uid()
        )
    );

-- Organizers can update disputes (resolve/reject)
CREATE POLICY "Organizers can update disputes" ON public.match_disputes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.brkt_matches m
            JOIN public.brkt_versions v ON m.version_id = v.id
            JOIN public.tournaments t ON v.tournament_id = t.id
            WHERE m.id = match_disputes.match_id AND t.organizer_id = auth.uid()
        )
    );
