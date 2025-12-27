-- Create a function to get tournament participants with their profile information
CREATE OR REPLACE FUNCTION public.get_tournament_participants(p_tournament_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    tournament_id UUID,
    created_at TIMESTAMPTZ,
    registration_type TEXT,
    team_name TEXT,
    team_captain TEXT,
    team_members TEXT,
    username TEXT,
    full_name TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if the user is the tournament organizer
    IF NOT EXISTS (
        SELECT 1 FROM tournaments t
        WHERE t.id = p_tournament_id
        AND t.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        tr.id,
        tr.user_id,
        tr.tournament_id,
        tr.created_at,
        tr.registration_type,
        tr.team_name,
        tr.team_captain,
        tr.team_members,
        p.username,
        p.full_name
    FROM tournament_registrations tr
    LEFT JOIN profiles p ON p.id = tr.user_id
    WHERE tr.tournament_id = p_tournament_id
    ORDER BY tr.created_at DESC;
END;
$$; 