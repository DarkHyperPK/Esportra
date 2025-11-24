# Map Tables Consolidation Analysis

## Current Structure (4 Tables)

### 1. **game_maps** (Master Data)
- **Scope**: Game-level (all games)
- **Purpose**: Reference data - all available maps
- **Relationships**: None (standalone)
- **Size**: Small, rarely changes
- **Example**: Valorant has ~10 maps

### 2. **tournament_map_pools** (Junction Table)
- **Scope**: Tournament-level
- **Purpose**: Many-to-many relationship (tournament ↔ maps)
- **Relationships**: `tournament_id` → `map_id`
- **Size**: Medium (one row per map per tournament)
- **Example**: Tournament with 7 maps = 7 rows

### 3. **match_map_vetos** (State Table)
- **Scope**: Match-level
- **Purpose**: Veto process state for each match
- **Relationships**: `match_id`, `tournament_id`, `team1_id`, `team2_id`
- **Size**: One row per match
- **Example**: 8-team tournament = 7 matches = 7 rows

### 4. **match_map_veto_actions** (Audit Log)
- **Scope**: Match-level
- **Purpose**: Historical log of all actions
- **Relationships**: `veto_id` → `match_id`
- **Size**: Many rows per match (one per action)
- **Example**: BO3 match = ~15-20 actions

## Consolidation Options & Issues

### ❌ **Option 1: Merge ALL into one table**
**Issues:**
- Different scopes (game/tournament/match) would require complex filtering
- Performance degradation (scanning large table for simple queries)
- Data integrity issues (different constraints per scope)
- Real-time subscriptions would be inefficient
- Indexing becomes complex

### ✅ **Option 2: Merge `tournament_map_pools` into `tournaments` table**
**Approach**: Store map pool as JSONB array in tournaments table
```sql
ALTER TABLE tournaments ADD COLUMN map_pool uuid[];
```

**Pros:**
- Reduces one table
- Simpler queries (no join needed)
- Map pool is tournament-specific anyway

**Cons:**
- ❌ **Loses referential integrity** (can't enforce map_id exists)
- ❌ **Harder to query** (need array operators, less efficient)
- ❌ **No cascade delete** (if map deleted, still in array)
- ❌ **Harder to validate** (can't use foreign key constraints)

**Verdict**: ⚠️ **Possible but risky** - loses data integrity guarantees

### ✅ **Option 3: Merge `match_map_veto_actions` into `match_map_vetos`**
**Approach**: Store actions as JSONB array
```sql
ALTER TABLE match_map_vetos ADD COLUMN actions jsonb[];
```

**Pros:**
- Reduces one table
- Actions are always fetched with veto state
- Simpler queries

**Cons:**
- ❌ **Real-time subscriptions** - Currently subscribing to actions separately for instant updates
- ❌ **Query performance** - Can't efficiently query individual actions
- ❌ **Audit trail** - Harder to track action history
- ❌ **Indexing** - Can't index action fields efficiently
- ❌ **Race conditions** - Current code checks `action_number` uniqueness which is harder with JSONB

**Verdict**: ❌ **Not recommended** - Breaks real-time functionality

### ✅ **Option 4: Keep `game_maps` separate, merge others**
**Approach**: 
- Keep `game_maps` (master data)
- Merge `tournament_map_pools` → JSONB in tournaments
- Merge `match_map_veto_actions` → JSONB in match_map_vetos

**Verdict**: ⚠️ **Partial success** - Still has issues from Options 2 & 3

## Recommended Approach: Keep Current Structure

### Why 4 Tables is Actually Good Design:

1. **Separation of Concerns**
   - `game_maps` = Master data (rarely changes)
   - `tournament_map_pools` = Configuration (tournament-specific)
   - `match_map_vetos` = State (match-specific)
   - `match_map_veto_actions` = Audit log (historical)

2. **Performance Benefits**
   - Each table can be indexed optimally
   - Queries are faster (smaller tables)
   - Real-time subscriptions work efficiently

3. **Data Integrity**
   - Foreign key constraints ensure data consistency
   - Cascade deletes work properly
   - Unique constraints prevent duplicates

4. **Real-time Functionality**
   - Current code subscribes to `match_map_vetos` and `match_map_veto_actions` separately
   - Merging would break instant action updates

5. **Scalability**
   - `match_map_veto_actions` can grow large (many actions per match)
   - Separating keeps `match_map_vetos` small and fast

## If You Still Want to Consolidate

### Minimal Consolidation (Safest):
**Merge only `tournament_map_pools` into `tournaments` table**

```sql
-- Add map_pool column
ALTER TABLE tournaments ADD COLUMN map_pool uuid[];

-- Migrate data
UPDATE tournaments t
SET map_pool = (
  SELECT array_agg(map_id)
  FROM tournament_map_pools tmp
  WHERE tmp.tournament_id = t.id
);

-- Drop table
DROP TABLE tournament_map_pools;
```

**Trade-offs:**
- ✅ One less table
- ❌ Loses foreign key validation
- ❌ Harder to query (array operators)
- ❌ No cascade delete protection

### Code Changes Needed:
- Update `MapPoolManager.tsx` to use `tournaments.map_pool` instead of `tournament_map_pools`
- Update `MapVeto.tsx` to query maps from `tournaments.map_pool` array
- Add validation logic to ensure map_ids exist in `game_maps`

## Final Recommendation

**Keep the 4-table structure** - It's well-designed and follows database normalization principles. The "overhead" of 4 tables is minimal compared to the benefits of:
- Data integrity
- Performance
- Real-time functionality
- Maintainability

If you must consolidate, only merge `tournament_map_pools` into `tournaments.map_pool` (JSONB array), but be aware of the trade-offs.

