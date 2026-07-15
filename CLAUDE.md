# Esportra Frontend

React 18 + TypeScript + Vite + Supabase esports tournament management and venue booking platform.

## Architecture

```
src/
  pages/          # Route-level composition — no direct DB calls
  components/     # UI only — data via props, no Supabase in components
    ui/           # shadcn primitives, shared design system
    {domain}/     # tournament, organizer, player, landing (<200 lines each)
  hooks/          # ALL Supabase/React Query logic — one concern per hook
  services/       # Pure domain algorithms (brackets, veto, etc.)
  schemas/        # Zod validation at boundaries
  types/          # TS interfaces mirroring DB — no runtime logic
  contexts/       # Auth, theme, hub providers (thin wrappers)
  lib/            # Supabase client, utilities
supabase/
  migrations/     # Schema + RLS + triggers (one concern per file)
```

**Stack:** TanStack Query, React Hook Form + Zod, Tailwind + shadcn/ui, Framer Motion, Capacitor mobile, SignalR.

Cross-repo: `esportra-backend` is the .NET API. `esportra-desktop` is ow-electron + SignalR Station Agent.

## Layer Rules

1. **Pages** compose — they wire hooks and pass data to components. Never call Supabase directly.
2. **Components** render UI — data via props or local UI state only. No DB access, no secrets.
3. **Hooks** own all Supabase/React Query logic. Parameterized queries, Zod before mutations.
4. **Services** own pure domain algorithms. Testable units, no side effects.
5. **Schemas** own Zod validation. Shared between forms and hooks.

**Forbidden:**
```typescript
// In a component or page — NEVER
const { data } = await supabase.from('tournaments').select('*');

// N+1 in a hook — NEVER
for (const id of ids) {
  await supabase.from('profiles').select('*').eq('id', id);
}
```

## Coding Style

- TypeScript only in `src/` — no `any`, no `as` casts unless truly necessary
- Immutable updates with spread — never mutate objects in-place
- Functions < 50 lines, files < 800 lines, components < 200 lines
- One component per file
- Path aliases `@/` for imports
- Organize by feature/domain, not by file type
- No `console.log` in production code
- Components: PascalCase. Hooks: `use` prefix. CSS classes: kebab-case

## Data Fetching

- Hooks encapsulate queries with `.limit()` and joins — one round trip
- Consolidate counts/stats into RPCs — no N+1
- Paginate lists: always `.limit()` + cursor/offset
- Invalidate queries narrowly on mutation success
- Server state via TanStack Query — don't duplicate into client stores
- Optimistic updates: snapshot → apply → rollback on failure with visible error feedback
- Parallel fetching for independent data — avoid request waterfalls

### Match Room Realtime

- Page-level: `useMatchRoomRealtime({ matchId })` — single `JoinMatch` per match page
- On `CheckInUpdated`: invalidate `match-checkins`, `match-room-state`
- On `TimeProposalUpdated`: invalidate `match-time-proposals`, `match-room-state`
- Child hooks: pass `subscribeRealtime: false` when parent coordinates

### Auth Roles

- Invalidate `meRolesQueryKey` after sign-in and on user-id change
- `removeQueries` on sign-out
- Gate role switcher on `deriveHasApprovedLicense(meRoles)` with session hint while loading

## Security (Blocking)

Security is blocking, not advisory.

### Non-negotiables

1. **Never trust the client** — role, ownership, eligibility enforced in RLS/RPC
2. **Every table has RLS** — `ENABLE ROW LEVEL SECURITY` before any policy
3. **Default deny** — explicit `USING`/`WITH CHECK`; no `USING (true)` on writes
4. **Service role key never in client** — only anon key in `VITE_*` env
5. **No `dangerouslySetInnerHTML`** without DOMPurify
6. **Supabase client methods only** — `.eq()`, never string-built filters
7. **File upload** — validate type, size, extension in hook before upload
8. **No secrets in bundle** — only `VITE_*`; rotate if leaked
9. **Never weaken RLS, triggers, or storage policies to fix bugs**

### Protected areas (do not touch)

- Tournament organizer field blocks (is_featured, status, approved_by, winner_id)
- Team invitation rules
- Match report participant checks
- Venue booking payment triggers
- Storage anonymous-write deny

### Response protocol

1. STOP — no workaround that weakens Layer 1 (Postgres)
2. Fix CRITICAL/HIGH before continuing
3. Rotate exposed secrets immediately
4. Grep for same anti-pattern repo-wide

## Design Quality

No generic template-looking UI. Output must look intentional and product-specific.

**Banned:** Default card grids with no hierarchy, stock hero sections, unmodified library defaults, flat layouts with no depth/motion, uniform spacing everywhere.

**Required (at least 4):** Clear hierarchy through scale contrast, intentional rhythm, depth/layering, typography with character, semantic color, designed interaction states, grid-breaking composition, motion that clarifies.

## Testing

- **Vitest** for unit tests
- TDD: write test (RED) → implement (GREEN) → refactor (IMPROVE)
- Target 80%+ coverage on domain logic and hooks
- Test as non-admin user for RLS changes

## Git Workflow

- Conventional commits: `<type>: <description>` (feat, fix, refactor, docs, test, chore, perf, ci)
- `npm run build` must pass before commit (includes chunk checks and button antipattern checks)
- No secrets in diff (check for `sk-`, `eyJ`, passwords, `service_role`)
- PRs: analyze full commit history, comprehensive summary, include test plan

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (with checks)
npm run lint         # ESLint (zero warnings)
npm run test         # Vitest
npm run preview      # Preview production build
```

## Feature Build Order

Migration (RLS) → types → schema → hook → components → page → verify as non-admin

## Implementation Protocol (New Features)

7 phases — phases 1–4 are thinking, phases 5–7 are building:

1. **Discovery** — scope, actors, data, dependencies
2. **Interaction map** — per-actor actions and system responses
3. **Edge cases** — timing, permissions, state conflicts, scale
4. **Plan** — file-level task list, DB → backend → frontend build order
5. **Backend** — migration + RLS + triggers + RPCs
6. **Frontend** — hooks + types + schemas + components + page
7. **Verify** — persistence, role access, error recovery, build passes
