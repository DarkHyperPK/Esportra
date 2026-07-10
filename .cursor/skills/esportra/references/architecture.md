# Esportra Architecture

Authoritative structure for how code is organized and how data flows.  
Extends `project-guidelines/IMPLEMENTATION_GUIDE.md` §11 and `CODING_GUIDELINES.md` §6.

## Layer model (top → bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ Pages (src/pages/)           Route-level composition        │
├─────────────────────────────────────────────────────────────┤
│ Components (src/components/) UI only — no direct DB calls   │
├─────────────────────────────────────────────────────────────┤
│ Hooks (src/hooks/)             All Supabase / API fetching    │
├─────────────────────────────────────────────────────────────┤
│ Services (src/services/)       Domain logic (brackets, veto) │
├─────────────────────────────────────────────────────────────┤
│ Schemas (src/schemas/)         Zod validation at boundaries  │
├─────────────────────────────────────────────────────────────┤
│ lib/ + types/ + utils/         Client, helpers, types        │
├─────────────────────────────────────────────────────────────┤
│ Supabase                       Postgres + RLS + RPCs         │
│ Edge Functions (when added)    JWT-verified server logic     │
└─────────────────────────────────────────────────────────────┘
```

**Rule:** Data flows down through hooks; never skip a layer (no `supabase.from()` in components).

## Directory map

| Path | Responsibility | Max size guidance |
|------|----------------|-------------------|
| `src/pages/` | Route entry, layout, error boundaries | Compose only |
| `src/components/ui/` | shadcn primitives, JackButton | Reusable, dumb |
| `src/components/{domain}/` | tournament, organizer, player, landing | <200 lines each |
| `src/hooks/` | TanStack Query + mutations, one concern per hook | No UI |
| `src/contexts/` | Auth, theme, hub providers | Thin wrappers |
| `src/services/` | Pure domain algorithms | Testable units |
| `src/schemas/` | Zod — shared with forms | One schema per form/entity |
| `src/types/` | TS interfaces mirroring DB | No runtime logic |
| `src/lib/supabase` | Single client instance | Never duplicate client |
| `supabase/migrations/` | Schema, RLS, triggers, RPCs | One concern per file |

## Component boundaries

### Pages do
- Wire hooks, pass data to components
- Handle route params (`useParams`)
- Mount error boundaries and loading shells

### Pages do not
- Call Supabase directly
- Contain business logic >20 lines (extract to hook/service)

### Hooks do
- Encapsulate queries with `.limit()` and joins
- Validate inputs with Zod before mutations
- Surface errors via toast or return `{ error }` for UI

### Hooks do not
- Import UI components
- Store server state in `useState` when React Query should own it

## Data fetching patterns

```typescript
// Hook pattern (required)
export function useTournament(id: string) {
  return useQuery({
    queryKey: ['tournament', id],
    queryFn: () => fetchTournament(id),
    enabled: !!id,
  });
}

// Service/helper — parameterized, no string interpolation
async function fetchTournament(id: string) {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, tournament_participants(*, profiles(username, avatar_url))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}
```

- Consolidate counts/stats into RPCs — no N+1
- Paginate lists: always `.limit()` + cursor/offset
- Invalidate queries narrowly on mutation success

## Feature addition order (architecture)

1. Migration: table + RLS + triggers (if protected fields)
2. Types in `src/types/`
3. Zod schema if user input
4. Hook in `src/hooks/`
5. Components
6. Page route
7. Verify as non-admin role

## Cross-repo architecture

| Repo | Role |
|------|------|
| `frag-and-book-main` | Web app + Supabase migrations |
| `esportra-backend` | .NET API (if used) |
| `esportra-desktop` | SignalR hub + Station Agent |

Desktop real-time: SignalR connection in `StationHubProvider` at layout level — never per-page.

## Decision records

Significant architecture choices → `docs/architecture/decisions/` as ADRs.  
Use `architecture-decision-records` skill. Format: `ADR-NNNN-short-title.md`.

## Related skills

| Task | Skill |
|------|-------|
| Multi-PR feature plan | `blueprint` |
| Record why we chose X | `architecture-decision-records` |
| API / RPC design | `api-design`, `backend-patterns` |
| DB schema / RLS | `postgres-patterns`, `database-migrations` |
| Refactor structure | `frontend-patterns` + **planner** agent |
