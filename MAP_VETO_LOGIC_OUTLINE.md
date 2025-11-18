# Map Veto System Logic Outline

## Overview
This document outlines the official Valorant tournament map veto logic for BO1, BO3, and BO5 formats.

**Team Naming Convention:**
- Team A = Team 1 (odd-numbered actions: 1, 3, 5, 7, 9, 11)
- Team B = Team 2 (even-numbered actions: 2, 4, 6, 8, 10, 12)

**Special Cases:**
- BO3: Action 5 breaks the pattern (Team B picks instead of Team A)
- BO5: Action 5, 7, 9 follow alternating pattern but with side selection after each pick

---

## BO1 (Best of 1) Logic

**Total Actions:** 7
**Maps Needed:** 1
**Sequence:** 5 bans → 1 pick → 1 side selection

### Action Breakdown:
1. **Action 1** (Team A): Ban map 1
2. **Action 2** (Team B): Ban map 2
3. **Action 3** (Team A): Ban map 3
4. **Action 4** (Team B): Ban map 4
5. **Action 5** (Team A): Ban map 5
6. **Action 6** (Team B): Pick map 1 (the map to play)
7. **Action 7** (Team A): Pick side (Attack/Defend) for map 1

### Key Points:
- Standard alternating pattern (odd = Team A, even = Team B)
- No special cases
- Side is picked by Team A (opposite of Team B who picked the map)

---

## BO3 (Best of 3) Logic

**Total Actions:** 9
**Maps Needed:** 3
**Sequence:** 2 bans → 2 picks+side → 2 bans → 1 side selection (last map auto-assigned)

### Action Breakdown:
1. **Action 1** (Team 1): Ban map 1
2. **Action 2** (Team 2): Ban map 2
3. **Action 3** (Team 1): Pick map 1 (first map to play)
4. **Action 4** (Team 2): Pick side (Attack/Defend) for map 1
5. **Action 5** (Team 2): Pick map 2 (second map to play)
6. **Action 6** (Team 1): Pick side (Attack/Defend) for map 2
7. **Action 7** (Team 2): Ban map 3
8. **Action 8** (Team 1): Ban map 4
9. **Action 9** (Team 1): Pick side (Attack/Defend) for map 3 (last remaining map is automatically assigned to Team 1)

### Key Points:
- Team 1 bans first, then Team 2 bans
- Team 1 picks Map 1, Team 2 picks side for Map 1
- Team 2 picks Map 2, Team 1 picks side for Map 2
- Team 2 bans, then Team 1 bans
- After 2 bans, 2 picks+side, 2 more bans, the last remaining map becomes Map 3 automatically
- Team 1 picks the side for Map 3 (the decider map) - higher seed advantage
- Side selection always goes to the OPPOSITE team from the one that picked the map (except for the final map, which is auto-assigned to Team 1)

### Special Case Handling:
- When advancing to action 9 (final pick_side): The last remaining map is automatically assigned to Team 1's picked_maps array
- Team 1 then picks the side for this auto-assigned map (higher seed advantage)

---

## BO5 (Best of 5) Logic

**Total Actions:** 11
**Maps Needed:** 5
**Sequence:** 2 bans → 4 picks+side → 1 side selection (last map auto-assigned)

### Action Breakdown:
1. **Action 1** (Team 1): Ban map 1
2. **Action 2** (Team 2): Ban map 2
3. **Action 3** (Team 1): Pick map 1 (first map to play)
4. **Action 4** (Team 2): Pick side (Attack/Defend) for map 1
5. **Action 5** (Team 2): Pick map 2 (second map to play)
6. **Action 6** (Team 1): Pick side (Attack/Defend) for map 2
7. **Action 7** (Team 1): Pick map 3 (third map to play)
8. **Action 8** (Team 2): Pick side (Attack/Defend) for map 3
9. **Action 9** (Team 2): Pick map 4 (fourth map to play)
10. **Action 10** (Team 1): Pick side (Attack/Defend) for map 4
11. **Action 11** (Team 1): Pick side (Attack/Defend) for map 5 (last remaining map is automatically assigned to Team 1)

### Key Points:
- Team 1 bans first, then Team 2 bans
- Team 1 picks Map 1, Team 2 picks side for Map 1
- Team 2 picks Map 2, Team 1 picks side for Map 2
- Team 1 picks Map 3, Team 2 picks side for Map 3
- Team 2 picks Map 4, Team 1 picks side for Map 4
- After 2 bans, 4 picks+side, the last remaining map becomes Map 5 automatically
- Team 1 picks the side for Map 5 (the decider map) - higher seed advantage
- Side selection follows pattern: Team 2, Team 1, Team 2, Team 1, Team 1 (final map advantage)
- Side selection always goes to the OPPOSITE team from the one that picked the map (except for the final map, which is auto-assigned to Team 1)

### Special Case Handling:
- When advancing to action 11 (final pick_side): The last remaining map is automatically assigned to Team 1's picked_maps array
- Team 1 then picks the side for this auto-assigned map (higher seed advantage)

---

## Implementation Rules

### 1. Team Assignment for Actions

**Standard Pattern (BO1, BO5, most BO3 actions):**
- Odd actions (1, 3, 5, 7, 9, 11) = Team A (team1_id)
- Even actions (2, 4, 6, 8, 10, 12) = Team B (team2_id)

**BO3 Special Cases:**
- Action 3 = Team B (team2_id) ← **Exception: Team B picks first map (Team A banned first)**
- Action 5 = Team B (team2_id) ← **Exception: Team B picks second map**

### 2. Side Selection Logic

**Standard Rule:** The team that picks the side is the OPPOSITE team from the one that picked the map.

**BO3 Exception:** After auto_pick (action 9), Team A picks side for Map 3 (SAME team as auto-picker). This is an official Valorant rule.

**Examples:**
- Team A picks map → Team B picks side (standard)
- Team B picks map → Team A picks side (standard)
- Team A auto-picks Map 3 (BO3) → Team A picks side (exception)

### 3. Auto-Pick Logic

**When:** The last remaining map after all bans and picks
**Who:** The team whose turn it is (following standard pattern)
- BO3: Action 9 (Team A auto-picks)
- BO5: Action 11 (Team A auto-picks)

### 4. Map Index Calculation

**For Side Selection:**
- Find the last map in the team's `picked_maps` array that has `side === undefined`
- This is the map that was just picked and needs a side

**For Display:**
- Show the map that was just picked (before side selection)
- Display it prominently for side selection

---

## Code Implementation Strategy

1. **Centralized Team Calculation Function:**
   - `getTeamForAction(actionNumber, vetoFormat, team1Id, team2Id)`
   - Handles BO3 special case for action 5
   - Returns team ID

2. **Side Selection Team Calculation:**
   - `getSidePickerTeam(pickActionNumber, vetoFormat, team1Id, team2Id)`
   - Returns the OPPOSITE team from the one that picked the map (except BO3 action 10)

3. **Map Lookup for Side Selection:**
   - Find last map in team's `picked_maps` array with `side === undefined`
   - Fallback to last map if all have sides

4. **Validation:**
   - Ensure correct team is performing each action
   - Validate side selection is by opposite team
   - Check map availability before picks/bans

