-- Create tournament_staff table for organizer-assigned moderators
CREATE TABLE IF NOT EXISTS public.tournament_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'mod',
  permissions TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status = ANY (ARRAY['active','revoked','pending']::TEXT[])),
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tournament_staff_unique_member
  ON public.tournament_staff (tournament_id, user_id);

CREATE INDEX IF NOT EXISTS tournament_staff_tournament_idx
  ON public.tournament_staff (tournament_id);

CREATE INDEX IF NOT EXISTS tournament_staff_user_idx
  ON public.tournament_staff (user_id);

ALTER TABLE public.tournament_staff ENABLE ROW LEVEL SECURITY;

-- Organizers can manage staff for their tournaments
CREATE POLICY tournament_staff_select ON public.tournament_staff
  FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR auth.uid() = user_id
    OR auth.uid() = assigned_by
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY tournament_staff_insert ON public.tournament_staff
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY tournament_staff_update ON public.tournament_staff
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

CREATE POLICY tournament_staff_delete ON public.tournament_staff
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
    )
  );

-- keep updated_at fresh
CREATE TRIGGER trg_tournament_staff_updated_at
  BEFORE UPDATE ON public.tournament_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

