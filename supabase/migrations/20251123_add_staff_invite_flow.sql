-- Pending staff invitations & invitee acceptance policies

ALTER TABLE public.tournament_staff
  ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE public.tournament_staff
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz;

UPDATE public.tournament_staff
SET status = 'active',
    accepted_at = COALESCE(accepted_at, NOW()),
    responded_at = COALESCE(responded_at, NOW())
WHERE status NOT IN ('pending', 'revoked');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tournament_staff'
      AND policyname = 'tournament_staff_update_invitee'
  ) THEN
    CREATE POLICY tournament_staff_update_invitee ON public.tournament_staff
      FOR UPDATE
      USING (
        auth.uid() = user_id
        AND status = 'pending'
      )
      WITH CHECK (
        auth.uid() = user_id
        AND status IN ('active', 'revoked', 'pending')
      );
  END IF;
END $$;


