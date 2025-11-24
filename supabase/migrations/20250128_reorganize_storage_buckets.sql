-- Reorganize storage buckets with professional domain-based naming
-- Structure: {domain}.{category}.{subcategory}
-- This provides better organization and scalability

begin;

-- =====================================================
-- USERS DOMAIN
-- =====================================================

-- users.avatars (was: user-avatars)
-- Note: Bucket renaming requires manual migration in Supabase dashboard
-- This script creates new buckets with proper names
-- Old buckets should be migrated manually or via Supabase CLI

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'users.avatars',
  'users.avatars',
  true,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  5242880 -- 5MB
)
on conflict (id) do nothing;

-- users.documents.kyc (was: kyc-documents)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'users.documents.kyc',
  'users.documents.kyc',
  false, -- Private
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  10485760 -- 10MB
)
on conflict (id) do nothing;

-- users.uploads (was: user-uploads)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'users.uploads',
  'users.uploads',
  false, -- Private
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
  10485760 -- 10MB
)
on conflict (id) do nothing;

-- =====================================================
-- TOURNAMENTS DOMAIN
-- =====================================================

-- tournaments.banners (was: tournament-banners)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'tournaments.banners',
  'tournaments.banners',
  true,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  52428800 -- 50MB
)
on conflict (id) do nothing;

-- tournaments.results (was: tournament-results)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'tournaments.results',
  'tournaments.results',
  true,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  10485760 -- 10MB
)
on conflict (id) do nothing;

-- tournaments.media (was: tournament-screenshots)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'tournaments.media',
  'tournaments.media',
  true,
  array['image/jpeg', 'image/png', 'image/webp'],
  5242880 -- 5MB
)
on conflict (id) do nothing;

-- tournaments.disputes.evidence (new: dispute-evidence)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'tournaments.disputes.evidence',
  'tournaments.disputes.evidence',
  true,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
  5242880 -- 5MB
)
on conflict (id) do nothing;

-- =====================================================
-- TEAMS DOMAIN
-- =====================================================

-- teams.logos (was: team-logos)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'teams.logos',
  'teams.logos',
  true,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
  52428800 -- 50MB
)
on conflict (id) do nothing;

-- =====================================================
-- VENUES DOMAIN
-- =====================================================

-- venues.images (was: venue-images)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'venues.images',
  'venues.images',
  true,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  52428800 -- 50MB
)
on conflict (id) do nothing;

-- venues.layouts (was: venue-layouts)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'venues.layouts',
  'venues.layouts',
  true,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  10485760 -- 10MB
)
on conflict (id) do nothing;

-- =====================================================
-- SYSTEM DOMAIN
-- =====================================================

-- system.assets.games (was: game-assets)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'system.assets.games',
  'system.assets.games',
  true,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  10485760 -- 10MB
)
on conflict (id) do nothing;

-- system.assets.website (was: website-assets)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'system.assets.website',
  'system.assets.website',
  true,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  20971520 -- 20MB
)
on conflict (id) do nothing;

-- system.assets.sponsors (was: sponsor-logos)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'system.assets.sponsors',
  'system.assets.sponsors',
  true,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  5242880 -- 5MB
)
on conflict (id) do nothing;

-- system.notifications.attachments (was: notification-attachments)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'system.notifications.attachments',
  'system.notifications.attachments',
  false, -- Private
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  10485760 -- 10MB
)
on conflict (id) do nothing;

-- system.temp (was: temp-uploads)
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values (
  'system.temp',
  'system.temp',
  false, -- Private
  null, -- Any type
  20971520 -- 20MB
)
on conflict (id) do nothing;

-- =====================================================
-- RLS POLICIES
-- =====================================================
-- Note: RLS policies will need to be migrated manually
-- as they reference bucket_id which changes with bucket names
-- This is a placeholder - actual policies should be created
-- after bucket migration is complete

commit;

