-- Allow tournament organizers to view all registrations for their tournaments
CREATE POLICY "organizers_can_view_tournament_registrations"
ON public.tournament_registrations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id
        AND t.user_id = auth.uid()
    )
);

-- Allow tournament organizers to manage registrations for their tournaments
CREATE POLICY "organizers_can_manage_tournament_registrations"
ON public.tournament_registrations
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id
        AND t.user_id = auth.uid()
    )
); 