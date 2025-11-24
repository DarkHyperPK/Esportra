# Backward Compatible Unified Roles Migration

## Overview

This migration creates a unified `user_roles_unified` table while **maintaining 100% backward compatibility** with existing code. The old tables continue to work exactly as before.

## How It Works

### 1. New Unified Table
- Creates `user_roles_unified` table with all role types
- Migrates existing data from old tables
- No old tables are dropped or modified

### 2. Compatibility Views
The migration creates views that mimic the old table structures:

- **`user_roles_compat`** - Mirrors old `user_roles` table
- **`verified_roles_compat`** - Mirrors old `verified_roles` table  
- **`admin_user_roles_compat`** - Mirrors old `admin_user_roles` table

**Existing queries continue to work unchanged!**

### 3. Bidirectional Sync Triggers

**From Unified → Old Tables:**
- When you insert/update `user_roles_unified`, it automatically syncs to old tables
- Keeps old tables up-to-date for backward compatibility

**From Old Tables → Unified:**
- When you insert/update old tables, it automatically syncs to `user_roles_unified`
- Keeps unified table up-to-date

## What This Means

### ✅ Zero Breaking Changes
- All existing queries work exactly as before
- No code changes required immediately
- Website functionality remains 100% intact

### ✅ Gradual Migration
- You can migrate code at your own pace
- Old and new systems work side-by-side
- No rush to update everything

### ✅ Data Consistency
- Both old and new tables stay in sync automatically
- No risk of data inconsistency
- Safe to use either system

## Migration Strategy

### Phase 1: Run Migration (No Code Changes)
1. Run the migration script
2. Verify data was migrated correctly
3. Test that existing functionality still works
4. **No code changes needed at this stage**

### Phase 2: Gradual Code Migration (Optional)
1. Update new code to use `user_roles_unified`
2. Keep old code using old tables (it still works!)
3. Migrate old code when convenient
4. No deadline or pressure

### Phase 3: Full Migration (Future - Optional)
1. Once all code uses `user_roles_unified`
2. Can deprecate old tables (but not required)
3. Remove compatibility views if desired

## Example: How Existing Code Still Works

### Before Migration:
```typescript
// This query works
const { data } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true);
```

### After Migration:
```typescript
// This SAME query still works! (uses compatibility view)
const { data } = await supabase
  .from('user_roles')  // Actually queries user_roles_compat view
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true);
```

### New Code (Optional):
```typescript
// Or use the new unified table directly
const { data } = await supabase
  .from('user_roles_unified')
  .select('*')
  .eq('user_id', userId)
  .eq('is_active', true);
```

## Safety Features

1. **No Data Loss**: All data is preserved and migrated
2. **No Downtime**: Migration can run while site is live
3. **Rollback Safe**: Old tables remain intact
4. **Automatic Sync**: Triggers keep everything in sync
5. **Backward Compatible**: All existing queries work

## Testing Checklist

After running migration:

- [ ] Verify all users still have their roles
- [ ] Test role switching (casual/organizer/venue_owner)
- [ ] Test admin role assignments
- [ ] Test verification approval/rejection
- [ ] Check that existing queries return same results
- [ ] Verify no errors in browser console
- [ ] Test all role-dependent features

## FAQ

**Q: Will my existing code break?**  
A: No. Compatibility views ensure all existing queries work unchanged.

**Q: Do I need to update my code immediately?**  
A: No. You can migrate gradually at your own pace.

**Q: What if I write to old tables?**  
A: Triggers automatically sync to the unified table, so it stays consistent.

**Q: What if I write to the unified table?**  
A: Triggers automatically sync to old tables, so they stay consistent.

**Q: Can I use both systems?**  
A: Yes! They stay in sync automatically via triggers.

**Q: What happens if I delete the old tables?**  
A: The compatibility views will stop working. Keep old tables until you've fully migrated.

## Summary

✅ **Safe**: No breaking changes  
✅ **Compatible**: All existing code works  
✅ **Flexible**: Migrate at your own pace  
✅ **Consistent**: Automatic bidirectional sync  
✅ **Future-proof**: Unified structure for easier management

