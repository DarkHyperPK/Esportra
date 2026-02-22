-- Backfill organization_id in tournaments table based on organizer_id
-- This links existing tournaments to their owner's organization

UPDATE public.tournaments t
SET organization_id = o.id
FROM public.organizations o
WHERE t.organizer_id = o.owner_id
AND t.organization_id IS NULL;
