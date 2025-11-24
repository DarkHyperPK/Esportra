-- Allow tournament staff with dispute permissions to assist organizers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tournament_disputes'
      AND policyname = 'td_select_staff_mods'
  ) THEN
    CREATE POLICY td_select_staff_mods ON public.tournament_disputes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.tournament_staff ts
          WHERE ts.tournament_id = tournament_id
            AND ts.user_id = auth.uid()
            AND ts.status = 'active'
            AND 'disputes:assist' = ANY (ts.permissions)
        )
        OR auth.role() = 'service_role'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tournament_disputes'
      AND policyname = 'td_update_staff_mods'
  ) THEN
    CREATE POLICY td_update_staff_mods ON public.tournament_disputes
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.tournament_staff ts
          WHERE ts.tournament_id = tournament_id
            AND ts.user_id = auth.uid()
            AND ts.status = 'active'
            AND 'disputes:assist' = ANY (ts.permissions)
        )
        OR auth.role() = 'service_role'
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.tournament_staff ts
          WHERE ts.tournament_id = tournament_id
            AND ts.user_id = auth.uid()
            AND ts.status = 'active'
            AND 'disputes:assist' = ANY (ts.permissions)
        )
        OR auth.role() = 'service_role'
      );
  END IF;
END $$;

