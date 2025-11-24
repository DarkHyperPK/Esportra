-- Add check-in controls to tournaments and participants
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS check_in_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS check_in_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_remove_unchecked BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.tournament_participants
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tournament_participants_checkin
  ON public.tournament_participants (tournament_id, status, checked_in_at);

