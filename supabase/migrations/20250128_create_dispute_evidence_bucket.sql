-- Create dedicated dispute evidence storage bucket
-- Organized by dispute_id and dispute_reason for better categorization
-- Path structure: {dispute_id}/{dispute_reason}/{user_id}-{timestamp}.{ext}

begin;

-- Create tournaments.disputes.evidence bucket if it doesn't exist
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'tournaments.disputes.evidence',
  'tournaments.disputes.evidence',
  true, -- Public for viewing evidence
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  5242880 -- 5MB limit
)
on conflict (id) do nothing;

-- RLS Policies for dispute-evidence bucket
-- Allow public to view dispute evidence (for transparency)
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' 
      and tablename='objects' 
      and policyname='dispute_evidence_select_public'
  ) then
    create policy dispute_evidence_select_public on storage.objects
    for select
    using (bucket_id = 'tournaments.disputes.evidence');
  end if;

  -- Allow authenticated users to upload evidence
  -- Path validation will be handled in application code
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' 
      and tablename='objects' 
      and policyname='dispute_evidence_insert_authenticated'
  ) then
    create policy dispute_evidence_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'tournaments.disputes.evidence'
      and auth.uid() is not null
    );
  end if;

  -- Allow users to delete their own uploads or organizers to delete from their tournaments
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' 
      and tablename='objects' 
      and policyname='dispute_evidence_delete_authorized'
  ) then
    create policy dispute_evidence_delete_authorized on storage.objects
    for delete
    using (
      bucket_id = 'tournaments.disputes.evidence'
      and (
        owner = auth.uid()
        or exists (
          select 1 from public.tournament_disputes td
          join public.tournaments t on t.id = td.tournament_id
          where split_part(name, '/', 1) = td.id::text
            and t.organizer_id = auth.uid()
        )
      )
    );
  end if;
end $$;

commit;

