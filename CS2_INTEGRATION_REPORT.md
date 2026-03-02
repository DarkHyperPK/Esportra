# CS2 Integration Research Report
**Date:** 2026-03-02
**Status:** PARKED — Resume when ready

---

## What Was Investigated

### Goal
Automate CS2 tournament match management so organizers never leave Esportra:
- Auto-report match results (no manual score entry)
- Auto-advance brackets when match finishes
- Show CS2 player stats (KD, HS%, Win Rate) on team roster cards

---

## Findings

### 1. Faceit Hub Automation — BLOCKED (No Organizer API)

**Tested API key:** `FACEIT_API_KEY = 096279ab-2eb1-497e-855b-856993bf2b05`
**Test page built:** `/debug/faceit-org` (already deployed to staging)

**Result:** Key is Data API only (read-only). All organizer endpoints returned 401/403.

| Endpoint | Result |
|----------|--------|
| Data API — player/game lookup | ✅ 200 OK |
| Organizer API v1 — `/organizers/me` | ❌ 401 |
| Organizer API v1 — `/hubs` | ❌ 401 |
| Match API v2 — create match | ❌ 403 |
| Hub API | ❌ 401 |

**Root cause:** Creating Faceit match rooms programmatically requires a **Faceit Organizer API key** — obtained by creating a Faceit Organizer account and linking it to an App Studio app with organizer permissions. This is NOT the same as the standard developer API key.

The Faceit Partner Program (community subscriptions, badges) does NOT provide API access.
Faceit's three developer tiers (App Studio, Game Studio, Faceit SDK) do not expose a public match creation API for existing games like CS2.

**To unblock:** Create a Faceit Organizer account → link to App Studio app → re-run `/debug/faceit-org`.

---

### 2. Steam/CS2 Native API — NOT VIABLE

Valve does not provide a public match history REST API for CS2 (unlike Riot for Valorant).

| Method | What It Gives | Verdict |
|--------|--------------|---------|
| Steam Web API (`ISteamUserStats`) | Lifetime cumulative stats only (total kills, total wins) | ❌ No per-match data |
| CS2 Match Share Codes | Demo link for Valve matchmaking matches | ❌ Manual, Valve MM only |
| Game State Integration (GSI) | Live data to local HTTP server | ❌ Local machine only |
| Game Coordinator (unofficial) | Match history via reverse-engineered protocol | ❌ ToS risk, not REST |

---

### 3. Alternative: Server-Side Plugins (Self-Hosted)

The industry standard for CS2 tournament match reporting without Faceit:

**Get5 / MatchZy SourceMod Plugin**
- Open-source plugin for CS2 servers
- Handles: match config, map veto, knife round, live tracking
- POSTs webhook when match ends (scores, per-map data, player stats)
- Requires owning/renting CS2 servers

**Dathost (Recommended if going this route)**
- CS2 server hosting with full REST API
- Get5 pre-installed, pay-per-use (~$0.05/match)
- Server provisioned on demand via API when bracket match starts
- Webhook fires on match end → Esportra calls `finalize_match_locked()`
- Players connect via server IP shown in Esportra match room

**Dathost Flow:**
```
Match scheduled on Esportra
        ↓
Esportra calls Dathost API → provisions CS2 server
        ↓
Server IP shown in Esportra match room
        ↓
Players connect, Get5 handles veto + match
        ↓
Match ends → Dathost webhook → Esportra
        ↓
finalize_match_locked() → bracket advances
```

---

## What CAN Be Built Right Now (No Blockers)

### A. Auto-Scan CS2 Match Results (Faceit Data API)
Fully doable with existing key. Mirrors the Riot/Valorant auto-scan flow:
- Captain clicks "Auto-Fetch CS2 Result"
- Edge function calls `GET /players/{faceit_id}/history?game=cs2&limit=20`
- Lists recent matches with map, score, K/D
- Captain picks the match they just played
- Opponent confirms → bracket advances

**Files to build:**
- `supabase/functions/scan-faceit-matches/index.ts` (new)
- `supabase/functions/process-faceit-result/index.ts` (new)
- Rewrite `src/components/tournament/FaceitMatchReport.tsx`
- Update `src/hooks/useMatchResultReport.ts` (add faceit_match_id support)
- DB migration: make `riot_match_id` nullable, add `faceit_match_id` column

### B. CS2 Player Stats on Team Cards (Faceit Data API)
Fully doable with existing key:
- `GET /players/{faceit_id}/stats/cs2` returns lifetime KD, Win Rate %, HS%
- Cache in new `cs2_player_stats` table (mirror of `valorant_player_stats`)
- Show on `PlayerCard` for CS2 rosters alongside existing Valorant stats

**Files to build:**
- `supabase/migrations/` — add `cs2_player_stats` table
- Update `src/pages/player/Teams.tsx` — add `fetchFaceitStatsForMembers()`
- Update `src/components/player/PlayerCard.tsx` — add `isCS2` detection

### C. Webhook-Only Automation (Partial)
- Register webhook URL in Faceit App Studio
- Organizer creates match manually on Faceit Hub (30 seconds)
- Webhook fires on match end → Esportra auto-reports score + advances bracket
- Players/captains never need to do anything after the match

---

## Current State of Codebase

| File | Status |
|------|--------|
| `supabase/functions/faceit-oauth/index.ts` | ✅ Complete — PKCE OAuth, JWT decode fix deployed |
| `supabase/functions/faceit-match-proxy/index.ts` | ✅ Complete — auth-gated proxy to Faceit Data API |
| `supabase/functions/faceit-org-test/index.ts` | ✅ Built for scope testing (can be deleted after) |
| `src/hooks/useFaceitAccount.ts` | ✅ Complete — link/unlink, cross-tab sync |
| `src/pages/debug/FaceitOrgTest.tsx` | ✅ Built — test page at `/debug/faceit-org` |
| `src/components/tournament/FaceitMatchReport.tsx` | ⚠️ Manual Match ID paste — needs rewrite |
| CS2 player stats on team cards | ❌ Not started |
| Auto-scan CS2 match results | ❌ Not started |
| Webhook handler | ❌ Not started |

---

## Resume Checklist

When picking this back up, start with:

- [ ] **Option A** (recommended first): Build auto-scan + CS2 stats (no new infrastructure needed)
  - DB migration: `cs2_player_stats` table, `faceit_match_id` on `match_result_reports`
  - `scan-faceit-matches` edge function
  - `process-faceit-result` edge function
  - Rewrite `FaceitMatchReport.tsx`
  - Update `Teams.tsx` + `PlayerCard.tsx`

- [ ] **Option B** (if full automation desired): Get Faceit Organizer account
  - Create organizer account at `organizer.faceit.com`
  - Link to App Studio app
  - Re-run `/debug/faceit-org` to verify organizer scope
  - Build `create-faceit-match` + `faceit-webhook` edge functions

- [ ] **Option C** (if Faceit independence desired): Dathost integration
  - Create Dathost account + API key
  - Build server provisioning edge function
  - Integrate Get5 webhook with `finalize_match_locked()`

---

## Decision Needed Before Resuming

Which path to take:
1. **Faceit Data API auto-scan** (build now, good UX, no new infra)
2. **Faceit Organizer API** (full automation, needs organizer account first)
3. **Dathost self-hosted servers** (full control, no Faceit dependency, ~$0.05/match cost)
