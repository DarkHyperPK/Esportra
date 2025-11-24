-- Create RLS policies for all new domain-based storage buckets
-- This ensures proper access control for all storage buckets

begin;

-- =====================================================
-- USERS DOMAIN POLICIES
-- =====================================================

-- users.avatars - Public viewing, users can upload/update/delete their own
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_avatars_select_public'
  ) then
    create policy users_avatars_select_public on storage.objects
    for select
    using (bucket_id = 'users.avatars');
  end if;

  -- Users can INSERT their own avatars
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_avatars_insert_own'
  ) then
    create policy users_avatars_insert_own on storage.objects
    for insert
    with check (
      bucket_id = 'users.avatars'
      and auth.uid() is not null
    );
  end if;

  -- Users can UPDATE their own avatars
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_avatars_update_own'
  ) then
    create policy users_avatars_update_own on storage.objects
    for update
    using (
      bucket_id = 'users.avatars'
      and owner = auth.uid()
    );
  end if;

  -- Users can DELETE their own avatars
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_avatars_delete_own'
  ) then
    create policy users_avatars_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'users.avatars'
      and owner = auth.uid()
    );
  end if;
end $$;

-- users.documents.kyc - Private, users can only access their own documents
do $$
begin
  -- Users can SELECT their own KYC documents
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_documents_kyc_select_own'
  ) then
    create policy users_documents_kyc_select_own on storage.objects
    for select
    using (
      bucket_id = 'users.documents.kyc'
      and (
        owner = auth.uid()
        or exists (
          select 1 from profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
    );
  end if;

  -- Users can INSERT their own KYC documents
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_documents_kyc_insert_own'
  ) then
    create policy users_documents_kyc_insert_own on storage.objects
    for insert
    with check (
      bucket_id = 'users.documents.kyc'
      and auth.uid() is not null
    );
  end if;

  -- Users can UPDATE their own KYC documents
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_documents_kyc_update_own'
  ) then
    create policy users_documents_kyc_update_own on storage.objects
    for update
    using (
      bucket_id = 'users.documents.kyc'
      and owner = auth.uid()
    );
  end if;

  -- Users can DELETE their own KYC documents
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_documents_kyc_delete_own'
  ) then
    create policy users_documents_kyc_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'users.documents.kyc'
      and owner = auth.uid()
    );
  end if;
end $$;

-- users.uploads - Private, users can only access their own uploads
do $$
begin
  -- Users can SELECT their own uploads
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_uploads_select_own'
  ) then
    create policy users_uploads_select_own on storage.objects
    for select
    using (
      bucket_id = 'users.uploads'
      and owner = auth.uid()
    );
  end if;

  -- Users can INSERT their own uploads
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_uploads_insert_own'
  ) then
    create policy users_uploads_insert_own on storage.objects
    for insert
    with check (
      bucket_id = 'users.uploads'
      and auth.uid() is not null
    );
  end if;

  -- Users can UPDATE their own uploads
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_uploads_update_own'
  ) then
    create policy users_uploads_update_own on storage.objects
    for update
    using (
      bucket_id = 'users.uploads'
      and owner = auth.uid()
    );
  end if;

  -- Users can DELETE their own uploads
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='users_uploads_delete_own'
  ) then
    create policy users_uploads_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'users.uploads'
      and owner = auth.uid()
    );
  end if;
end $$;

-- =====================================================
-- TOURNAMENTS DOMAIN POLICIES
-- =====================================================

-- tournaments.banners - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_banners_select_public'
  ) then
    create policy tournaments_banners_select_public on storage.objects
    for select
    using (bucket_id = 'tournaments.banners');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_banners_insert_authenticated'
  ) then
    create policy tournaments_banners_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'tournaments.banners'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_banners_update_own'
  ) then
    create policy tournaments_banners_update_own on storage.objects
    for update
    using (
      bucket_id = 'tournaments.banners'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_banners_delete_own'
  ) then
    create policy tournaments_banners_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'tournaments.banners'
      and owner = auth.uid()
    );
  end if;
end $$;

-- tournaments.results - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_results_select_public'
  ) then
    create policy tournaments_results_select_public on storage.objects
    for select
    using (bucket_id = 'tournaments.results');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_results_insert_authenticated'
  ) then
    create policy tournaments_results_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'tournaments.results'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_results_update_own'
  ) then
    create policy tournaments_results_update_own on storage.objects
    for update
    using (
      bucket_id = 'tournaments.results'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_results_delete_own'
  ) then
    create policy tournaments_results_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'tournaments.results'
      and owner = auth.uid()
    );
  end if;
end $$;

-- tournaments.media - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_media_select_public'
  ) then
    create policy tournaments_media_select_public on storage.objects
    for select
    using (bucket_id = 'tournaments.media');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_media_insert_authenticated'
  ) then
    create policy tournaments_media_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'tournaments.media'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_media_update_own'
  ) then
    create policy tournaments_media_update_own on storage.objects
    for update
    using (
      bucket_id = 'tournaments.media'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='tournaments_media_delete_own'
  ) then
    create policy tournaments_media_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'tournaments.media'
      and owner = auth.uid()
    );
  end if;
end $$;

-- tournaments.disputes.evidence - Public viewing, authenticated users can upload
-- (Policies already created in 20250128_create_dispute_evidence_bucket.sql)
-- This is just a placeholder to note that policies exist

-- =====================================================
-- TEAMS DOMAIN POLICIES
-- =====================================================

-- teams.logos - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='teams_logos_select_public'
  ) then
    create policy teams_logos_select_public on storage.objects
    for select
    using (bucket_id = 'teams.logos');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='teams_logos_insert_authenticated'
  ) then
    create policy teams_logos_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'teams.logos'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='teams_logos_update_own'
  ) then
    create policy teams_logos_update_own on storage.objects
    for update
    using (
      bucket_id = 'teams.logos'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='teams_logos_delete_own'
  ) then
    create policy teams_logos_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'teams.logos'
      and owner = auth.uid()
    );
  end if;
end $$;

-- =====================================================
-- VENUES DOMAIN POLICIES
-- =====================================================

-- venues.images - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_images_select_public'
  ) then
    create policy venues_images_select_public on storage.objects
    for select
    using (bucket_id = 'venues.images');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_images_insert_authenticated'
  ) then
    create policy venues_images_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'venues.images'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_images_update_own'
  ) then
    create policy venues_images_update_own on storage.objects
    for update
    using (
      bucket_id = 'venues.images'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_images_delete_own'
  ) then
    create policy venues_images_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'venues.images'
      and owner = auth.uid()
    );
  end if;
end $$;

-- venues.layouts - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_layouts_select_public'
  ) then
    create policy venues_layouts_select_public on storage.objects
    for select
    using (bucket_id = 'venues.layouts');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_layouts_insert_authenticated'
  ) then
    create policy venues_layouts_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'venues.layouts'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_layouts_update_own'
  ) then
    create policy venues_layouts_update_own on storage.objects
    for update
    using (
      bucket_id = 'venues.layouts'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='venues_layouts_delete_own'
  ) then
    create policy venues_layouts_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'venues.layouts'
      and owner = auth.uid()
    );
  end if;
end $$;

-- =====================================================
-- SYSTEM DOMAIN POLICIES
-- =====================================================

-- system.assets.games - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_games_select_public'
  ) then
    create policy system_assets_games_select_public on storage.objects
    for select
    using (bucket_id = 'system.assets.games');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_games_insert_authenticated'
  ) then
    create policy system_assets_games_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'system.assets.games'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_games_update_own'
  ) then
    create policy system_assets_games_update_own on storage.objects
    for update
    using (
      bucket_id = 'system.assets.games'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_games_delete_own'
  ) then
    create policy system_assets_games_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'system.assets.games'
      and owner = auth.uid()
    );
  end if;
end $$;

-- system.assets.website - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_website_select_public'
  ) then
    create policy system_assets_website_select_public on storage.objects
    for select
    using (bucket_id = 'system.assets.website');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_website_insert_authenticated'
  ) then
    create policy system_assets_website_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'system.assets.website'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_website_update_own'
  ) then
    create policy system_assets_website_update_own on storage.objects
    for update
    using (
      bucket_id = 'system.assets.website'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_website_delete_own'
  ) then
    create policy system_assets_website_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'system.assets.website'
      and owner = auth.uid()
    );
  end if;
end $$;

-- system.assets.sponsors - Public viewing, authenticated users can upload
do $$
begin
  -- Public SELECT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_sponsors_select_public'
  ) then
    create policy system_assets_sponsors_select_public on storage.objects
    for select
    using (bucket_id = 'system.assets.sponsors');
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_sponsors_insert_authenticated'
  ) then
    create policy system_assets_sponsors_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'system.assets.sponsors'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_sponsors_update_own'
  ) then
    create policy system_assets_sponsors_update_own on storage.objects
    for update
    using (
      bucket_id = 'system.assets.sponsors'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_assets_sponsors_delete_own'
  ) then
    create policy system_assets_sponsors_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'system.assets.sponsors'
      and owner = auth.uid()
    );
  end if;
end $$;

-- system.notifications.attachments - Private, users can only access their own
do $$
begin
  -- Users can SELECT their own notification attachments
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_notifications_attachments_select_own'
  ) then
    create policy system_notifications_attachments_select_own on storage.objects
    for select
    using (
      bucket_id = 'system.notifications.attachments'
      and owner = auth.uid()
    );
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_notifications_attachments_insert_authenticated'
  ) then
    create policy system_notifications_attachments_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'system.notifications.attachments'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_notifications_attachments_update_own'
  ) then
    create policy system_notifications_attachments_update_own on storage.objects
    for update
    using (
      bucket_id = 'system.notifications.attachments'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_notifications_attachments_delete_own'
  ) then
    create policy system_notifications_attachments_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'system.notifications.attachments'
      and owner = auth.uid()
    );
  end if;
end $$;

-- system.temp - Private, users can only access their own temp files
do $$
begin
  -- Users can SELECT their own temp files
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_temp_select_own'
  ) then
    create policy system_temp_select_own on storage.objects
    for select
    using (
      bucket_id = 'system.temp'
      and owner = auth.uid()
    );
  end if;

  -- Authenticated users can INSERT
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_temp_insert_authenticated'
  ) then
    create policy system_temp_insert_authenticated on storage.objects
    for insert
    with check (
      bucket_id = 'system.temp'
      and auth.uid() is not null
    );
  end if;

  -- File owners can UPDATE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_temp_update_own'
  ) then
    create policy system_temp_update_own on storage.objects
    for update
    using (
      bucket_id = 'system.temp'
      and owner = auth.uid()
    );
  end if;

  -- File owners can DELETE
  if not exists (
    select 1 from pg_policies 
    where schemaname='storage' and tablename='objects' 
      and policyname='system_temp_delete_own'
  ) then
    create policy system_temp_delete_own on storage.objects
    for delete
    using (
      bucket_id = 'system.temp'
      and owner = auth.uid()
    );
  end if;
end $$;

commit;

