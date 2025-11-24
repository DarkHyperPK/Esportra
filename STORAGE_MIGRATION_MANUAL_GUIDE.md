# 🗂️ Manual Storage Migration Guide (No Scripts Required)

Since you prefer not to use migration scripts, here are your options:

## Option 1: Gradual Migration (Recommended - Easiest)

**Just keep both buckets!** This is the simplest approach:

1. ✅ New buckets are already created
2. ✅ Code is already updated to use new buckets
3. ✅ New uploads will automatically go to new buckets
4. ✅ Old files remain accessible in old buckets
5. ✅ No migration needed - just let it happen naturally

**Benefits:**
- Zero effort required
- No risk of data loss
- Old files remain accessible
- New files use new structure
- You can delete old buckets later when they're empty

**When to delete old buckets:**
- After all old files are no longer needed
- Or after manually moving important files
- Or never (they don't hurt anything)

## Option 2: Manual Migration via Supabase Dashboard

If you want to migrate specific important files:

### Steps:
1. Go to **Supabase Dashboard → Storage**
2. Open the **old bucket** (e.g., `user-avatars`)
3. Browse files and identify important ones
4. For each important file:
   - Click the file to view it
   - Download it (if needed)
   - Go to the **new bucket** (e.g., `users.avatars`)
   - Upload the file with the same name

### Which Files to Migrate:
- **Critical files only**: User avatars currently in use, active team logos, etc.
- **Skip**: Old/unused files can stay in old buckets
- **Priority**: Only migrate files that are actively being accessed

## Option 3: SQL-Only Approach (Limited)

You can use SQL to **update file references** in your database, but you still need to manually move files:

### Step 1: Find files referenced in database
```sql
-- Example: Find avatar URLs in profiles table
SELECT id, avatar_url 
FROM profiles 
WHERE avatar_url LIKE '%user-avatars%';
```

### Step 2: Update database references (after manual file move)
```sql
-- Example: Update avatar URLs to point to new bucket
UPDATE profiles 
SET avatar_url = REPLACE(avatar_url, 'user-avatars', 'users.avatars')
WHERE avatar_url LIKE '%user-avatars%';
```

**Note**: You still need to manually move the actual files via Dashboard.

## Option 4: Do Nothing (Simplest)

**Just leave it as-is!**

- ✅ New uploads go to new buckets (code is updated)
- ✅ Old files stay in old buckets (still accessible)
- ✅ Both work simultaneously
- ✅ No migration needed
- ✅ Delete old buckets later (or never)

This is actually a valid strategy - many systems run with both old and new buckets for months.

## Recommendation

**Go with Option 1 (Gradual Migration) or Option 4 (Do Nothing)**

Since your code is already updated:
- All **new uploads** will use new buckets ✅
- Old files remain in old buckets (still work) ✅
- No immediate action needed ✅
- You can migrate important files manually later if needed ✅

## What You've Already Done

✅ Created new buckets  
✅ Updated all code references  
✅ Created RLS policies  
✅ Everything is ready to go!

**The system will work perfectly with both old and new buckets existing simultaneously.**

## When Old Buckets Will Be Empty

Old buckets will naturally become empty over time as:
- Users upload new avatars (goes to `users.avatars`)
- Teams upload new logos (goes to `teams.logos`)
- New disputes are filed (goes to `tournaments.disputes.evidence`)
- etc.

You can delete old buckets when you're confident they're no longer needed (or just leave them).

## Summary

**You don't need to migrate anything right now!**

Your system is already configured correctly:
- ✅ New files → New buckets
- ✅ Old files → Old buckets (still accessible)
- ✅ Everything works

Just let it run naturally. No scripts, no manual work, no stress! 🎉

