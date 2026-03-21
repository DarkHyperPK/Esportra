# Performance Audit — Esportra Web Platform

**Date**: 2026-03-17
**Scope**: React 18 + TypeScript + Vite + Supabase + TanStack Query
**Severity**: HIGH = measurable user impact now, MEDIUM = degrades at scale, LOW = cleanup / best practice

---

## 1. Bundle & Build

### HIGH — Production debug import fires live DB queries on every page load
**File**: `src/App.tsx:142`
```ts
import './utils/testSupabase';
```
`src/utils/testSupabase.ts:45` calls `testSupabaseConnection()` at module load. This executes `supabase.auth.getSession()` and a `profiles` table query on **every production page load** — wasted network round-trips, leaked internals in console.

**Fix**: Delete line 142 from App.tsx. Remove `testSupabase.ts` or gate behind `import.meta.env.DEV`.

---

### HIGH — 6 unused dependencies add ~14.7 MB to node_modules
**File**: `package.json`

| Package | Size | Status |
|---------|------|--------|
| `tesseract.js` | ~8 MB | Not imported anywhere |
| `@aws-sdk/client-s3` | ~4 MB | Not imported anywhere |
| `styled-components` | ~1.2 MB | Not imported anywhere |
| `@g-loot/react-tournament-brackets` | ~0.7 MB | Replaced by custom GraphBracket |
| `keen-slider` | ~0.4 MB | Not imported anywhere |
| `react-svg-pan-zoom` | ~0.4 MB | Not imported anywhere |

**Fix**: `npm uninstall tesseract.js @aws-sdk/client-s3 styled-components @g-loot/react-tournament-brackets keen-slider react-svg-pan-zoom`

---

### HIGH — vendor-main chunk catches everything
**File**: `vite.config.ts:29-39`

Every `node_modules` package not explicitly split lands in `vendor-main`. This includes 20+ Radix packages, react-router, tanstack-query, zod, date-fns, etc. — a single monolithic chunk that invalidates on any dependency update.

**Fix**: Split additional high-value chunks:
```ts
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('recharts')) return 'vendor-charts';
    if (id.includes('framer-motion')) return 'vendor-framer';
    if (id.includes('lucide-react')) return 'vendor-lucide';
    if (id.includes('@supabase')) return 'vendor-supabase';
    if (id.includes('@radix-ui')) return 'vendor-radix';
    if (id.includes('@tanstack')) return 'vendor-tanstack';
    if (id.includes('react-router') || id.includes('react-dom')) return 'vendor-react';
    if (id.includes('zod') || id.includes('react-hook-form')) return 'vendor-forms';
    return 'vendor-misc';
  }
}
```

---

### MEDIUM — SuspensionGuard lazy-loaded as global wrapper
**File**: `src/App.tsx:43`
```ts
const SuspensionGuard = React.lazy(() =>
  import("./components/auth/SuspensionGuard").then(m => ({ default: m.SuspensionGuard }))
);
```
Every route is wrapped inside this Suspense boundary (line 168). If SuspensionGuard's chunk hasn't loaded, the entire app shows the fallback spinner. SuspensionGuard should be eagerly imported — it's needed on every page.

**Fix**: Change to a static import: `import { SuspensionGuard } from "@/components/auth/SuspensionGuard";`

---

### MEDIUM — Dual react plugins installed
**File**: `package.json:58,103`

Both `@vitejs/plugin-react` (Babel, line 58 in dependencies) and `@vitejs/plugin-react-swc` (SWC, line 103 in devDependencies) are installed. Only SWC is used in `vite.config.ts`. The Babel plugin bloats `node_modules`.

**Fix**: `npm uninstall @vitejs/plugin-react`

---

## 2. React Rendering

### HIGH — UnifiedProfileContext busts memo on every render
**File**: `src/contexts/UnifiedProfileContext.tsx:411-426`

The context `value` object is a **plain object literal** — new reference every render. None of the 12 methods (`loadUnifiedProfile`, `switchMode`, `canAccessMode`, `updateProfile`, `refreshProfile`, `getCurrentDisplayName`, `getCurrentAvatar`, `getCurrentEarnings`, `getCurrentStats`, `getUnifiedRating`, `getUnifiedBadges`, `getUnifiedActivity`) use `useCallback`. Every consumer of this context re-renders on every parent state change.

**Fix**: Wrap all methods in `useCallback`. Wrap the value object in `useMemo`.

---

### HIGH — AdminContext.hasPermission defeats useMemo
**File**: `src/contexts/AdminContext.tsx:114-127`

`hasPermission` is defined as a plain inline function (line 114), then listed as a dependency of `useMemo` (line 127). Because `hasPermission` is recreated every render, the `useMemo` re-runs every render — it's a no-op.

**Fix**: Wrap `hasPermission` in `useCallback` with `[permissions]` as deps.

---

### HIGH — Bracket graph re-renders all nodes on zoom
**File**: `src/components/bracket/GraphBracket.tsx`

- `GraphMatchCard` (imported, no `React.memo`)
- `EdgePath` (inline at line 397, no `React.memo`)
- `zoom` state (line 51) lives in the same component that renders all nodes/edges
- A 32-team bracket = 31 match cards + 30 edges = **61 components** all re-rendering on every zoom/pan interaction

**Fix**:
1. Wrap `GraphMatchCard` in `React.memo`
2. Extract `EdgePath` and wrap in `React.memo`
3. Memoize node/edge arrays with `useMemo`
4. For brackets >64 teams, consider `@tanstack/react-virtual` or canvas rendering

---

### MEDIUM — Missing React.memo on repeated list items
High-frequency list components rendered without memoization:
- `TournamentCard` — rendered in grids of 10-50+
- `VenueCard` — rendered in search results
- `GraphMatchCard` — up to 127 instances (128-team bracket)

**Fix**: Wrap each in `React.memo` with shallow prop comparison.

---

### MEDIUM — Framer Motion `height: 'auto'` causes layout thrash
9 locations use `animate={{ height: 'auto' }}` which triggers layout recalculation every animation frame. Common in accordion/collapsible patterns.

**Fix**: Replace with `max-height` transitions or use `AnimatePresence` with `exit` instead of animating height.

---

## 3. Data Fetching & Caching

### HIGH — N+1 profile fetches in tournament details (up to 192 requests)
**File**: `src/pages/tournaments/Details.tsx:200-216`

For each unique `team_id`, a separate `apiClient.get('/api/teams/${id}')` call (line 200-207). For each unique `user_id`, a separate `apiClient.get('/api/profiles/${id}')` call (line 211-216). A 32-team tournament with 6-player rosters = 32 team fetches + 192 profile fetches.

**Fix**: Create batch endpoints (`POST /api/teams/batch`, `POST /api/profiles/batch`) or use the existing `/api/teams/batch` endpoint that `GraphBracket.tsx` already uses.

---

### HIGH — CaptainMatchPage sequential waterfall
**File**: `src/pages/tournaments/CaptainMatchPage.tsx:85-114`

Three-level sequential fetch waterfall:
1. Fetch tournament (line 203)
2. Fetch bracket versions (enabled by `tournament?.id`, line 96)
3. Loop over versions with `for...of` (lines 106-110) — **sequential, not parallel**

Plus N+1 team fetches (lines 164-166): individual `apiClient.get('/api/teams/${id}')` per team.

**Fix**: Use `Promise.all` for version graph fetches. Use the batch teams endpoint.

---

### HIGH — useMessaging SignalR connection rebuilds on conversation switch
**File**: `src/hooks/useMessaging.ts:271`

`useEffect` deps: `[user, conversationIds, currentConversation]`. The connection setup/teardown runs in this effect, so switching conversations **destroys and rebuilds the entire SignalR connection** — reconnect, re-authenticate, re-join all conversations.

**Fix**: Remove `currentConversation` from the effect deps. Access it via a `useRef` inside the `MessageReceived` handler.

---

### HIGH — useTeamMutations invalidates wrong query key
**File**: `src/hooks/teams/useTeamMutations.ts:113`

Invalidates `['user_teams']` but `useTeamManagement.ts:95` uses `['my-teams']`. After editing a team, the list is **never refetched** — stale data persists until manual navigation.

**Fix**: Change invalidation to `['my-teams']` to match the actual query key.

---

### MEDIUM — 10+ hooks not migrated to TanStack Query
These hooks use raw `useEffect` + `useState` for data fetching instead of TanStack Query, missing out on caching, deduplication, and stale-while-revalidate:

| Hook | File |
|------|------|
| `useReviews` | `src/hooks/useReviews.ts` |
| `useVenueSearch` | `src/hooks/useVenueSearch.ts` |
| `useAdminUsers` | `src/hooks/useAdminUsers.ts` |
| `useUserManagement` | `src/hooks/useUserManagement.ts` |
| `useMessaging` | `src/hooks/useMessaging.ts` |
| `useProfile` | `src/hooks/useProfile.ts` |
| `usePublicBracketData` | `src/hooks/usePublicBracketData.ts` |
| `useMyStaffAssignments` | `src/hooks/useMyStaffAssignments.ts` |
| `useStaffInvites` | `src/hooks/useStaffInvites.ts` |
| `useTournamentStaff` | `src/hooks/useTournamentStaff.ts` |

**Fix**: Migrate to `useQuery` / `useMutation` patterns progressively. Highest-priority: `usePublicBracketData` (most traffic), `useMessaging` (most complex).

---

### MEDIUM — Details.tsx uses 5 useEffect+useState instead of TanStack Query
**File**: `src/pages/tournaments/Details.tsx`

Five separate `useEffect` → `setState` fetch cycles with no caching, deduplication, or retry logic. Also has a stale-deps bug at line 579 (`checkRegistration` not in useEffect deps).

**Fix**: Convert each fetch to a `useQuery` call with appropriate `queryKey` and `enabled` flags.

---

## 4. Network & Assets

### HIGH — Render-blocking Google Fonts CSS @import
**File**: `src/index.css:2`
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@400;600;700;800&display=swap');
```
CSS `@import` blocks rendering until the external stylesheet is fetched. This adds 200-500ms to First Contentful Paint.

**Fix**: Move to `<link rel="preload" as="style">` in `index.html`, or self-host the font files with `font-display: swap`.

---

### MEDIUM — ~100 `<img>` tags missing `loading="lazy"`
Most images across the codebase use bare `<img src={...}>` without `loading="lazy"`, causing all images to load eagerly even when offscreen.

**Fix**: Add `loading="lazy"` to all images that are not above-the-fold. Consider creating a shared `<LazyImage>` component.

---

### MEDIUM — SeamlessVideoLoop preload="auto"
**File**: `src/components/effects/SeamlessVideoLoop.tsx:36`

`preload="auto"` downloads the entire video file on every page load, even on mobile or slow connections. Also has a `console.log('Video playing:', src)` at line 43 that fires on every loop iteration.

**Fix**: Use `preload="metadata"` and start full load only when video enters viewport. Remove the console.log.

---

## 5. Console Pollution

### MEDIUM — 30+ console.log calls in production code

Key offenders:

| File | Count | Lines |
|------|-------|-------|
| `src/hooks/useMapVetoMachine.ts` | 8 | 358, 447, 451, 476, 482, 529, 554, 630 |
| `src/pages/tournaments/CaptainMatchPage.tsx` | 14 | 88, 93, 120, 136, 147, 151, 175, 178, 182, 200, 236, 271, 288, 297 |
| `src/components/effects/SeamlessVideoLoop.tsx` | 1 | 43 |
| `src/utils/testSupabase.ts` | 2+ | various |

**Fix**: Strip all `console.log` from production. Add an ESLint rule: `"no-console": ["warn", { "allow": ["warn", "error"] }]`.

---

## 6. Supabase-Specific

### MEDIUM — No `.limit()` on several list queries
Some hooks fetch entire tables without pagination, which will degrade as data grows. This applies to participant lists in `Details.tsx`, staff lists, and admin user lists.

**Fix**: Add `.limit()` and cursor/offset pagination to all list queries.

---

## Summary Table

| # | Severity | Category | Issue | Impact |
|---|----------|----------|-------|--------|
| 1 | HIGH | Bundle | `testSupabase` import in production | 2 wasted API calls per page load |
| 2 | HIGH | Bundle | 6 unused deps (~14.7 MB) | Bloated install, potential bundle inclusion |
| 3 | HIGH | Bundle | Monolithic vendor-main chunk | Cache-busts on any dep update |
| 4 | HIGH | Rendering | UnifiedProfileContext no memo | All consumers re-render every cycle |
| 5 | HIGH | Rendering | AdminContext useMemo defeated | Admin UI re-renders cascade |
| 6 | HIGH | Rendering | GraphBracket 61+ nodes no memo | Bracket janks on zoom/pan |
| 7 | HIGH | Data | Details.tsx N+1 (up to 224 fetches) | 10-30s load on large tournaments |
| 8 | HIGH | Data | CaptainMatchPage sequential waterfall | 3-5s unnecessary wait |
| 9 | HIGH | Data | useMessaging SignalR reconnect | Connection drop on conversation switch |
| 10 | HIGH | Data | useTeamMutations wrong query key | Stale team data after edit |
| 11 | HIGH | Network | Render-blocking @import fonts | 200-500ms FCP penalty |
| 12 | MEDIUM | Bundle | SuspensionGuard lazy as global wrapper | Flash of loading on cold start |
| 13 | MEDIUM | Bundle | Dual react plugins | Wasted node_modules space |
| 14 | MEDIUM | Rendering | No React.memo on list cards | Unnecessary re-renders in grids |
| 15 | MEDIUM | Rendering | Framer Motion height:'auto' (9 spots) | Layout thrash during animation |
| 16 | MEDIUM | Data | 10+ hooks not on TanStack Query | No caching/dedup/retry |
| 17 | MEDIUM | Data | Details.tsx 5 raw useEffect fetches | No caching, stale deps bug |
| 18 | MEDIUM | Network | ~100 images missing lazy loading | Wasted bandwidth |
| 19 | MEDIUM | Network | Video preload="auto" | Eager full video download |
| 20 | MEDIUM | Console | 30+ console.log in production | Noise, minor perf hit in hot paths |
| 21 | MEDIUM | Supabase | Missing .limit() on list queries | Unbounded data fetch |

---

## Top 5 Actions — Maximum ROI

### 1. Delete `testSupabase` import + remove unused deps
**Effort**: 10 minutes | **Impact**: Eliminates 2 wasted API calls/page + removes 14.7 MB dead weight
```
- Delete line 142 in App.tsx
- npm uninstall tesseract.js @aws-sdk/client-s3 styled-components @g-loot/react-tournament-brackets keen-slider react-svg-pan-zoom @vitejs/plugin-react
```

### 2. Fix context memoization (UnifiedProfileContext + AdminContext)
**Effort**: 30 minutes | **Impact**: Eliminates cascade re-renders across the entire app
```
- Wrap all methods in useCallback
- Wrap context value in useMemo
- Fix hasPermission → useCallback with [permissions] deps
```

### 3. Fix data fetching: N+1 in Details.tsx + CaptainMatchPage + wrong query key
**Effort**: 2 hours | **Impact**: Tournament pages go from 10-30s → <2s, team edits reflect immediately
```
- Use batch endpoints for teams/profiles
- Promise.all for bracket version fetches
- Fix query key: 'user_teams' → 'my-teams'
```

### 4. Fix useMessaging SignalR reconnection + move fonts to preload
**Effort**: 30 minutes | **Impact**: No more dropped connections on conversation switch + 200-500ms FCP improvement
```
- useRef for currentConversation in useMessaging
- Move @import to <link rel="preload"> in index.html
```

### 5. Split vendor-main chunk + add React.memo to bracket/list components
**Effort**: 1 hour | **Impact**: Better caching, smoother bracket interaction
```
- Expand manualChunks in vite.config.ts
- React.memo on GraphMatchCard, EdgePath, TournamentCard, VenueCard
```
