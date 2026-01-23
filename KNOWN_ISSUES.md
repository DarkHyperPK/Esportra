# Known Issues

## Swiss Bracket System (v0.2.4)

### 1. Undo Round Destructiveness
- **Issue**: The "Undo Round" feature performs a *hard delete* of match records from the database (`brkt_matches`).
- **Impact**: Any data associated with those matches (e.g., chat logs, detailed stats if linked individually) will be permanently lost.
- **Workaround**: Only use "Undo Round" immediately after generation if you notice an error. Do not use it after matches have been played/scored.

### 2. Forced Rematches in Edge Cases
- **Issue**: To prevent teams from being dropped ("Vanishing Team" bug), the generator now forces pairings for leftover teams even if they have played before (ignoring the "no rematch" constraint for the final pair).
- **Impact**: In very rare scenarios with small pools or awkward standings, a rematch might occur.
- **Mitigation**: This is preferable to a team not playing at all, but organizers should be aware.

### 3. UI Filters vs. Data Latency
- **Issue**: Sometimes the "Matches" list needs a manual refresh or group tab switch to reflect newly generated rounds immediately if the realtime subscription lags.
- **Impact**: Minor UX inconvenience.
- **Workaround**: Use the "Refresh" button or switch tabs if matches don't appear instantly.
