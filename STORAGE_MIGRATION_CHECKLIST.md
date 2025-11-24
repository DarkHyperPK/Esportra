# 🗂️ Storage Bucket Migration Checklist

## ✅ Already Complete

- [x] New buckets created via `20250128_reorganize_storage_buckets.sql`
- [x] RLS policies created via `20250128_create_storage_rls_policies.sql`
- [x] All code references updated to new bucket names
- [x] System is ready to use!

## 🎯 Migration Strategy

**You have 3 options:**

### Option A: Do Nothing (Recommended)
- ✅ New uploads automatically go to new buckets
- ✅ Old files remain accessible in old buckets
- ✅ No migration needed - just let it happen naturally
- ✅ Delete old buckets later when empty (or never)

### Option B: Manual Migration (Via Dashboard)
- Use Supabase Dashboard to manually move important files
- See `STORAGE_MIGRATION_MANUAL_GUIDE.md` for details

### Option C: Script Migration (If you change your mind)
- Use the provided migration scripts
- Requires Supabase credentials

## Migration Steps (If Using Option B or C)

### 1. Install Dependencies (if needed)
```bash
npm install @supabase/supabase-js dotenv
# or
yarn add @supabase/supabase-js dotenv
```

### 2. Set Environment Variables
Ensure your `.env.local` file has:
```
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **Important**: Use the service role key (not anon key) for migration script

### 3. Run Migration Script

**Option A: TypeScript (if you have tsx/ts-node)**
```bash
npx tsx scripts/migrate-storage-buckets.ts
```

**Option B: JavaScript**
```bash
node scripts/migrate-storage-buckets.js
```

### 4. Review Migration Results
- Check the console output for any errors
- Verify file counts match between old and new buckets
- Note any failed migrations

### 5. Manual Verification
- [ ] Check Supabase Dashboard → Storage
- [ ] Verify new buckets contain all files
- [ ] Spot-check a few files to ensure they're accessible
- [ ] Test uploads/downloads in your application

### 6. Application Testing
- [ ] Test user avatar uploads
- [ ] Test team logo uploads
- [ ] Test tournament banner uploads
- [ ] Test dispute evidence uploads
- [ ] Test KYC document uploads
- [ ] Test all file viewing functionality

### 7. Wait Period (Recommended)
- [ ] Keep old buckets for at least 7 days
- [ ] Monitor application for any issues
- [ ] Check error logs for storage-related errors

### 8. Delete Old Buckets

**Option A: Via Supabase Dashboard**
1. Go to Storage → Buckets
2. Select old bucket
3. Click "Delete bucket"
4. Confirm deletion

**Option B: Via SQL (after verification)**
1. Open `20250128_delete_old_storage_buckets.sql`
2. Uncomment the buckets you want to delete
3. Run the migration in Supabase SQL Editor

**Option C: Delete all at once (after full verification)**
```sql
DELETE FROM storage.buckets 
WHERE id IN (
  'user-avatars',
  'kyc-documents',
  'user-uploads',
  'tournament-banners',
  'tournament-results',
  'tournament-screenshots',
  'dispute-evidence',
  'team-logos',
  'venue-images',
  'venue-layouts',
  'game-assets',
  'website-assets',
  'sponsor-logos',
  'notification-attachments',
  'temp-uploads'
);
```

## Post-Migration

- [ ] All old buckets deleted
- [ ] Application fully tested
- [ ] No storage-related errors in logs
- [ ] Documentation updated
- [ ] Team notified of migration completion

## Rollback Plan

If issues occur:
1. **Immediate**: Update code to use old bucket names temporarily
2. **Short-term**: Restore files from backup if needed
3. **Long-term**: Fix issues and re-run migration

## Troubleshooting

### Migration Script Errors
- **"Missing credentials"**: Check `.env.local` file
- **"Permission denied"**: Ensure using service role key
- **"Bucket not found"**: Verify new buckets exist

### File Upload Errors After Migration
- Check RLS policies are correctly set
- Verify bucket names in code match new names
- Check file paths haven't changed

### Missing Files
- Check if files were in subdirectories (may need path adjustment)
- Verify migration script completed successfully
- Check old buckets still exist (can restore if needed)

## Support

If you encounter issues:
1. Check migration script output for specific errors
2. Verify bucket names and RLS policies
3. Test with a single bucket first before migrating all
4. Keep old buckets until fully verified

