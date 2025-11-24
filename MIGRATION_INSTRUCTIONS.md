# Table Renaming Migration Instructions

## Summary

Renamed 3 map veto tables to use game-specific naming:
- `tournament_map_pools` → `valorant_tournament_map_pools`
- `match_map_vetos` → `valorant_match_map_vetos`
- `match_map_veto_actions` → `valorant_match_map_veto_actions`

## Migration Steps

### 1. Run the Migration

Execute the migration script in your Supabase SQL editor:
```bash
supabase/migrations/20250124_rename_map_veto_tables_to_game_specific.sql
```

This migration will:
- ✅ Rename the 3 tables
- ✅ Update all indexes
- ✅ Update foreign key constraints
- ✅ Update RLS policies
- ✅ Update database functions (`initialize_match_veto`, `reset_match_veto`)
- ✅ Update table comments

### 2. Regenerate TypeScript Types

After running the migration, regenerate your Supabase types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

Or if using Supabase CLI:
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 3. Verify Code Updates

All code has been updated to use the new table names:
- ✅ `src/components/tournament/MapVeto.tsx` - Uses `valorantTables` utility
- ✅ `src/pages/tournaments/Brackets.tsx` - Updated table references
- ✅ `src/components/organizer/MapPoolManager.tsx` - Updated table references
- ✅ `src/pages/tournaments/MapVetoToken.tsx` - Updated table references
- ✅ `src/components/tournament/MapVetoResultBadge.tsx` - Updated table references

### 4. Utility Function

Created `src/utils/gameTables.ts` for future game support:
- `valorantTables` - Current Valorant table names
- `getGameTableName()` - Helper for future games (CS2, etc.)

## Notes

- **TypeScript errors are expected** until types are regenerated
- The code will work at runtime even with TypeScript errors
- All functionality is preserved - no breaking changes to the API
- Universal tables (`tournament_matches`, `tournament_match_results`, etc.) remain unchanged

## Testing Checklist

After migration, test:
- [ ] Map pool selection in tournament details
- [ ] Map veto process for matches
- [ ] Map veto reset functionality
- [ ] Bracket generation and display
- [ ] Real-time updates for map veto

