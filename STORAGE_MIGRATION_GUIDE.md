# 🗂️ Storage Bucket Migration Guide

## Overview
This guide helps you migrate from the old bucket naming convention to the new professional domain-based structure.

## New Bucket Structure

### Domain-Based Organization
```
{domain}.{category}.{subcategory}
```

### Bucket Mapping

| Old Name | New Name | Domain | Public |
|----------|----------|--------|--------|
| `user-avatars` | `users.avatars` | Users | ✅ |
| `kyc-documents` | `users.documents.kyc` | Users | ❌ |
| `user-uploads` | `users.uploads` | Users | ❌ |
| `tournament-banners` | `tournaments.banners` | Tournaments | ✅ |
| `tournament-results` | `tournaments.results` | Tournaments | ✅ |
| `tournament-screenshots` | `tournaments.media` | Tournaments | ✅ |
| `dispute-evidence` | `tournaments.disputes.evidence` | Tournaments | ✅ |
| `team-logos` | `teams.logos` | Teams | ✅ |
| `venue-images` | `venues.images` | Venues | ✅ |
| `venue-layouts` | `venues.layouts` | Venues | ✅ |
| `game-assets` | `system.assets.games` | System | ✅ |
| `website-assets` | `system.assets.website` | System | ✅ |
| `sponsor-logos` | `system.assets.sponsors` | System | ✅ |
| `notification-attachments` | `system.notifications.attachments` | System | ❌ |
| `temp-uploads` | `system.temp` | System | ❌ |

## Migration Steps

### Option 1: Manual Migration (Recommended for Production)

1. **Create New Buckets**
   - Run the migration SQL: `20250128_reorganize_storage_buckets.sql`
   - This creates all new buckets with proper structure

2. **Migrate Files**
   - Use Supabase Dashboard → Storage
   - Copy files from old buckets to new buckets
   - Or use Supabase CLI to bulk migrate

3. **Update Code References**
   - All code has been updated to use new bucket names
   - Search your codebase for old bucket names and update if needed

4. **Update RLS Policies**
   - Old policies reference old bucket IDs
   - Create new policies for new bucket IDs
   - Remove old policies after migration

5. **Delete Old Buckets** (After verification)
   - Only delete after confirming all files are migrated
   - Keep backups!

### Option 2: Gradual Migration

1. Create new buckets alongside old ones
2. Update new uploads to use new buckets
3. Gradually migrate existing files
4. Update all code references
5. Remove old buckets when empty

## Code Updates Required

All frontend code has been updated to use new bucket names:

- ✅ `DisputeCenter.tsx` → `tournaments.disputes.evidence`
- ✅ `DisputeSubmission.tsx` → `tournaments.disputes.evidence`
- ✅ `RaiseDispute.tsx` → `tournaments.disputes.evidence`
- ⚠️ Other components may still reference old bucket names

## RLS Policy Migration

After creating new buckets, you'll need to recreate RLS policies:

```sql
-- Example: users.avatars policies
CREATE POLICY "users_avatars_select_public" ON storage.objects
FOR SELECT USING (bucket_id = 'users.avatars');

CREATE POLICY "users_avatars_insert_own" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'users.avatars' 
  AND auth.uid() = owner
);
```

## Benefits of New Structure

1. **Better Organization**: Domain-based grouping makes it clear what each bucket is for
2. **Scalability**: Easy to add new categories (e.g., `tournaments.brackets`, `users.documents.verification`)
3. **Professional**: Follows industry-standard naming conventions
4. **Maintainability**: Clear hierarchy makes it easier to manage permissions and policies
5. **Clarity**: Names are self-documenting

## Verification Checklist

- [ ] All new buckets created
- [ ] Files migrated from old to new buckets
- [ ] Code references updated
- [ ] RLS policies created for new buckets
- [ ] Test uploads working
- [ ] Test downloads working
- [ ] Old buckets empty and ready for deletion
- [ ] Backup of old buckets created

## Rollback Plan

If issues occur:
1. Keep old buckets until migration is verified
2. Update code to use old bucket names temporarily
3. Fix issues and retry migration
4. Old buckets can be restored from backups

