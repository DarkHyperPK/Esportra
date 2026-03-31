# Esportra Frontend — Copilot Instructions

> React 18 + TypeScript + Vite + Supabase + TanStack Query + .NET API + SignalR
> Esports tournament management and venue booking platform.

---

## Repository Structure

```
src/
  components/    # React components (one per file, PascalCase)
  contexts/      # React context providers (AuthContext, AdminContext)
  hooks/         # Custom hooks (ALL data fetching goes here)
  pages/         # Route-level page components
  types/         # TypeScript interfaces/types
  services/      # Business logic (bracket generators, veto service)
  lib/           # Utilities (supabase client, apiClient, signalrClient)
  config/        # App configuration
  schemas/       # Zod validation schemas
  utils/         # Helper functions
  data/          # Static data (esportsGames.json, etc.)
```

**Backend repo**: `D:\esportra-backend` — .NET 9 Minimal API
**Backend migrations**: `D:\esportra-backend\src\Esportra.Infrastructure\Migrations\Scripts\` (DbUp, NOT in this repo)

---

## Critical Rules

### TypeScript

- **TypeScript only** in `src/`. No `.js` files.
- **No `any`** without a comment explaining why
- **Zero `// @ts-ignore`** in production code
- **Prefer union types over enums**: `type Status = 'pending' | 'live' | 'completed'`
- `strict: true` in tsconfig

### Data Fetching

- **No raw Supabase/API calls in components** — all through custom hooks in `src/hooks/`
- **apiClient** (`src/lib/apiClient.ts`) wraps fetch for .NET API calls
- **TanStack Query** for all server state
- **Cache defaults**: staleTime 5min, gcTime 24h, refetchOnWindowFocus false
- **Query keys are hierarchical**: `['tournaments', id, 'participants']`

### Components

- **One component per file**, filename matches component name
- **Functions under 50 lines**, components under 200 lines — extract if longer
- **Every page handles**: loading (skeleton/spinner), error (message + retry), empty (message + CTA)
- **No `return null` on error** — always show visible feedback
- **Destructive actions require confirmation dialog** (delete, leave, cancel, ban)

### Styling & Design

- **Dark theme only** — page bg `#050505`, card bg `#0a0a0c`
- **Rose-500** (`#f43f5e`) is primary accent for CTAs and links
- **Fonts**: Poppins (headings, 600-800), Inter (body, 400-500) — no others
- **Icons**: `lucide-react` only — no Font Awesome, Heroicons, etc.
- **Glassmorphism** for elevated surfaces: `backdrop-filter: blur(20px) saturate(180%)`
- **Cards**: `bg-[#0a0a0c]`, `border-white/5`, `rounded-3xl`, hover → `translateY(-4px)`
- **Mobile-first**: breakpoints sm(640) md(768) lg(1024) xl(1280) 2xl(1536)
- **Touch targets**: minimum 44x44px
- **Animations**: Framer Motion for components, CSS keyframes for backgrounds, respect `prefers-reduced-motion`

### State Management

| Type | Where |
|------|-------|
| Server data | TanStack Query |
| Auth state | React Context (`AuthContext`) |
| Admin state | React Context (`AdminContext`) |
| UI state | Component `useState` |
| Form state | React Hook Form + Zod |
| URL state | React Router `useSearchParams` |

### Real-time (SignalR)

- Always clean up subscriptions on unmount
- Use filters to avoid unrelated events
- Invalidate TanStack Query cache from SignalR handlers (don't set data manually)

### Error Handling

```typescript
// ❌ NEVER
catch (e) { }                                          // Silent swallow
catch (e) { toast({ title: 'Error' }); }              // Useless message
catch (e) { console.log('error', e); }                // Console only

// ✅ ALWAYS
catch (error: Error) {
  toast({
    title: 'Registration failed',
    description: error.message.includes('full')
      ? 'Tournament is full. Try the waitlist.'
      : 'Could not register. Please try again.',
    variant: 'destructive',
  });
}
```

### Toast Notifications

| Type | Duration | When |
|------|----------|------|
| Success | 3s auto-dismiss | User completed an action |
| Error | Persistent | Action failed |
| Warning | 5s | Session/time warnings |
| Info | 4s | Passive updates |

- One toast at a time
- Never toast routine success ("Data loaded")
- Only user-initiated actions get toasts

---

## Database & Migrations

**⚠️ Migrations live in the backend repo**, not here:
`D:\esportra-backend\src\Esportra.Infrastructure\Migrations\Scripts\`

- Uses **DbUp** (.NET) with embedded SQL resources
- Naming: `YYYYMMDDHHMMSS_descriptive_name.sql`
- One migration per concern
- Use `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` for idempotency
- Storage buckets created via `INSERT INTO storage.buckets` in migrations
- **Never modify the database directly** — always create a migration file

---

## Dependencies Policy

### Approved
`@radix-ui/*`, `shadcn/ui`, `tailwindcss`, `tailwind-merge`, `clsx`, `@tanstack/react-query`, `react-hook-form`, `zod`, `framer-motion`, `@supabase/supabase-js`, `react-router-dom`, `date-fns`, `recharts`, `lucide-react`, `@microsoft/signalr`

### Banned
- **Lodash** → use native JS
- **Moment.js** → use `date-fns`
- **Axios** → `apiClient.ts` wraps fetch
- **Redux/Zustand/MobX** → TanStack Query + Context
- **Font Awesome/Heroicons** → Lucide only
- **Other modal/dialog libs** → Radix handles it

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Interfaces | PascalCase | `TournamentParticipant` |
| Types (unions) | PascalCase | `MatchStatus` |
| Functions | camelCase, verb-first | `fetchTournament`, `handleSubmit` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_TEAM_SIZE` |
| Booleans | `is`/`has`/`can` prefix | `isLoading`, `hasPermission` |
| Event handlers | `handle`/`on` prefix | `handleClick`, `onSubmit` |
| Hooks | `use` prefix | `useTeamManagement` |
| DB tables | snake_case, plural | `tournament_participants` |
| DB columns | snake_case | `organizer_id`, `created_at` |

---

## Import Aliases

```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TournamentRow } from "@/types/tournament";
```

---

## Performance Budgets

| Metric | Budget |
|--------|--------|
| Initial JS bundle | < 300KB gzipped |
| Largest chunk | < 150KB gzipped |
| First Contentful Paint | < 1.5s |
| Supabase queries per page | < 5 |
| Re-renders per interaction | < 3 |

---

## Commit & Branch Rules

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`
- **Branch**: `staging` (staging env), `main` (production, auto-deploys)
- First line under 72 chars
- `npm run build` MUST pass before pushing

---

## Key Files

```
src/App.tsx                          # Root component, all routes
src/contexts/AuthContext.tsx          # Auth state
src/contexts/AdminContext.tsx         # Admin roles/permissions
src/lib/apiClient.ts                 # .NET API client
src/lib/signalrClient.ts            # SignalR connection builder
src/lib/supabase.ts                 # Supabase client
src/lib/queryClient.ts              # TanStack Query defaults
vite.config.ts                       # Build config
```

---

## Parked / Do Not Implement

- CS2 integration — not without explicit instruction
- Faceit Organizer API — read-only key, blocked
- Riot player stats on team cards — disabled, don't re-enable

---

## Implementation Protocol (New Features Only)

For **new features** (not bug fixes or small changes), follow the 7-phase protocol:

1. **Discovery** — Ask about scope, users/roles, behavior, data, dependencies
2. **Interaction Mapping** — For each actor: actions, preconditions, system response, UI feedback
3. **Edge Cases** — Timing, data integrity, permissions, state conflicts, network, scale
4. **Implementation Plan** — DB changes, backend logic, types, hooks, components, build order
5. **Backend Build** — Migration → RLS → triggers → RPCs → storage → test as non-admin
6. **Frontend Build** — Hook → types → component → loading/error/empty states → toast → cache invalidation
7. **Verification** — Persistence (refresh → data still there), role access, error recovery, build passes

Phases 1–4 are thinking. Phases 5–7 are building. Do not skip phases for new features.
**Migrations go in the backend repo**: `D:\esportra-backend\src\Esportra.Infrastructure\Migrations\Scripts\`
