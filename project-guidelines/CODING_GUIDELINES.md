# Esportra Coding Guidelines

> **Version 2.0** — Last Updated: March 2026
> Rules for writing code in this codebase. Not optional.

---

## Table of Contents
1. [Why This Document Exists](#1-why-this-document-exists)
2. [Performance](#2-performance)
3. [Security](#3-security)
4. [Database & Migrations](#4-database--migrations)
5. [Code Style](#5-code-style)
6. [Component Architecture](#6-component-architecture)
7. [Writing for Humans](#7-writing-for-humans)
8. [Pre-push Checklist](#8-pre-push-checklist)
9. [Production Debugging](#9-production-debugging)
10. [Rules](#10-rules)

---

## 1. Why This Document Exists

We've shipped bugs that cost real time to fix. Database calls that fired 12 times when once would do. Security holes that let unauthenticated users write to storage. Components that silently swallowed errors and showed "0" instead of telling anyone something broke.

Every rule here exists because we learned the lesson the hard way.

---

## 2. Performance

### Database calls are expensive — treat them that way

This is the single biggest performance issue we've had.

**Consolidate queries.** If you need five counts from five tables, don't make five requests. Write a single RPC.

```typescript
// WRONG: 5 separate requests
const users = await supabase.from('profiles').select('*', { count: 'exact' });
const venues = await supabase.from('venues').select('*', { count: 'exact' });
const tournaments = await supabase.from('tournaments').select('*', { count: 'exact' });

// RIGHT: one RPC, one round trip
const { data } = await supabase.rpc('get_admin_dashboard_stats');
```

**Use Supabase joins, not manual lookups.** Don't fetch a tournament then loop through participant IDs making individual profile requests.

```typescript
// WRONG: N+1 query pattern
const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', id).single();
for (const pid of tournament.participant_ids) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', pid).single();
}

// RIGHT: let Postgres do the join
const { data } = await supabase
  .from('tournaments')
  .select('*, tournament_participants(*, profiles(username, avatar_url))')
  .eq('id', id)
  .single();
```

**Paginate everything.** Never call `.select('*')` without a `.limit()`. Lists fetch one page at a time.

**Cache what doesn't change often.** Game metadata from RAWG. User profiles for short periods. Not tournament brackets mid-match.

### Frontend performance
- Lazy load routes. Not every user visits the admin dashboard.
- Use `React.memo` and `useCallback` where re-renders are measurable, not everywhere.
- Debounce search inputs (300ms minimum).
- Images from Supabase Storage should use transforms (resizing, WebP) where supported.

---

## 3. Security

### Core rules
1. **Never trust the client.**
2. **Every table has RLS.** No exceptions.
3. **Default deny.** Add permissions, don't remove restrictions.
4. **Admin ops go through `SECURITY DEFINER` RPCs**, not direct table updates.
5. **Edge Functions verify JWT on every request.**

### Existing protections — do not remove, weaken, or "temporarily disable"
- **Tournament organizers** can't set `is_featured`, `status`, `approved_by`, `approved_at`, or `winner_id` on their own tournaments (trigger: `trg_block_organizer_tournament_updates`).
- **Team members** can only join with an accepted invitation.
- **Match reports** require being an actual participant in the match.
- **Venue bookings** have payment fields protected by trigger.
- **Storage buckets** have no anonymous write access.
- **Edge Functions** all require JWT auth or service-role verification.

### Writing new RLS policies
When you add a new table:
1. `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`
2. Add SELECT policy for who can read.
3. Add INSERT policy with `WITH CHECK`.
4. Add UPDATE/DELETE as needed.
5. Include a `service_role` bypass if backend operations need full access.
6. **Test by signing in as a non-admin user** and trying things you shouldn't be able to do.

```sql
CREATE POLICY "users_read_own" ON your_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON your_table
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );
```

### Secrets
- Database passwords, API keys, SSH keys: GitHub Secrets or Coolify env vars. Never in code.
- `.env.local` is gitignored — local development only.
- New secrets for GitHub Actions: add in repo Settings → Secrets and variables → Actions.

---

## 4. Database & Migrations

All schema changes go through the migration system. Production DB auto-syncs from `supabase/migrations/` via GitHub Actions.

### Workflow
1. Make changes on local Supabase (localhost:54322).
2. Run `supabase db diff -f describe_what_you_changed`.
3. Read the generated `.sql` file. Verify it does what you expect.
4. Commit alongside your frontend code.
5. Push. GitHub Actions runs `supabase db push` automatically.

### Do not
- Edit production DB through Supabase Studio. Changes won't be in migration history and will conflict.
- Write migrations that drop data without a backup plan.
- Combine unrelated changes in one migration file. One migration per concern.

### Naming
- Migration files: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Database columns: `snake_case`
- Tables: `snake_case`, plural (`tournaments`, `match_scores`, `venue_bookings`)

---

## 5. Code Style

### TypeScript
- Everything in `src/` is TypeScript. No `.js` files.
- Define interfaces for all database-derived data shapes.
- Don't use `any` unless you genuinely can't determine the type. If you write `as any`, leave a comment.

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Database columns | `snake_case` | `organizer_id`, `created_at` |
| TypeScript variables/functions | `camelCase` | `fetchTournament`, `isLoading` |
| React components | `PascalCase` | `TournamentCard`, `PlayerProfile` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_TEAM_SIZE` |
| Files (components) | PascalCase | `TournamentCard.tsx` |
| Files (hooks) | camelCase with `use` | `useTeamManagement.ts` |
| Files (utils) | camelCase | `imageUtils.ts` |
| Migrations | Timestamped snake_case | `20260315_add_venue_pricing.sql` |

Be descriptive. `handleUnsuspendUser` beats `handleClick2`. `fetchTournamentWithParticipants` beats `getData`.

### Imports
Use path aliases (`@/`) for all internal imports:
```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
```

---

## 6. Component Architecture

### File structure
- One component per file. Filename matches component name.
- Hooks in `src/hooks/`. Context providers in `src/contexts/`.
- No raw Supabase calls in components — always through hooks.

### Component size
- Keep components under 200 lines. If larger, extract sub-components or hooks.
- Keep functions under 50 lines. If larger, break into smaller named functions.

### Error states
Error states are **visible**, not silent. If a query fails, show a message. Don't render an empty page.

```typescript
// WRONG: silently shows nothing
if (error) return null;

// RIGHT: tells the user what happened
if (error) return <ErrorState message="Failed to load tournament." retry={refetch} />;
```

### Loading states
Every data-dependent component needs a loading state:
```typescript
if (isLoading) return <TournamentSkeleton />;
```

### Empty states
Every list needs a designed empty state:
```typescript
if (data?.length === 0) return <EmptyState message="No tournaments found." action={<CreateButton />} />;
```

---

## 7. Writing for Humans

### Drop the filler
Don't write "in order to" when "to" works. Don't write "it is important to note that" — just state the thing.

### Be specific
```
// BAD: "The API returned an error"
// GOOD: "Supabase RPC get_admin_dashboard_stats returned 42501 permission denied"
```

### Error messages should help
```
// BAD:  "Something went wrong"
// GOOD: "Your session expired. Please sign in again."
```

### Don't inflate importance
Code comments don't need to explain that a function "plays a key role in the overall architecture." Just say what it does: "Fetches the user's profile and checks the suspension flag."

### Commit messages
Conventional commits: `fix:`, `feat:`, `chore:`, `docs:`. First line under 72 characters.
```
fix(admin): pass correct username to audit log on unsuspend

The unsuspend action used selectedUser state which was null for
inline dropdown actions. Changed to pass the name directly from
the user row data.
```

---

## 8. Pre-push Checklist

1. **`npm run build`** — if it doesn't build locally, it won't build in production.
2. **Browser console** — check for errors, especially after touching auth or admin pages.
3. **Role test** — if you changed RLS or a trigger, test as a non-admin user. Admin service role bypasses everything.
4. **Edge Function test** — if changed, test with `supabase functions serve` before pushing.

---

## 9. Production Debugging

When something breaks in production but works locally:

1. **Missing DB objects.** Did you create a function/trigger locally but forget `supabase db diff`? Check `supabase/migrations/`.
2. **RLS blocking legitimate access.** Query production as the affected user's role.
3. **Environment variables.** Does the Edge Function expect a secret that's only in your local env?
4. **Stale cache.** Coolify sometimes serves old builds. Force redeploy.
5. **Different data.** Production has real users with edge cases: null `username`, missing `avatar_url`, profiles created before a column existed. Handle nulls.

---

## 10. Rules

1. **TypeScript only** in `src/`. No `.js` files.
2. **No raw Supabase calls in components.** Data access goes through custom hooks.
3. **Every table gets RLS.** Default deny. Explicit allow.
4. **Consolidate queries.** Use RPCs and Supabase joins. No N+1 patterns.
5. **Paginate everything.** Never `.select('*')` without `.limit()`.
6. **Error states are visible.** Never return `null` on error. Show a message.
7. **Conventional commits.** `type(scope): description` format.
8. **One migration per concern.** Don't bundle unrelated schema changes.
9. **Never weaken existing security.** Don't remove triggers, don't disable RLS policies.
10. **`npm run build` before pushing.** If it fails locally, fix it first.
11. **Descriptive names.** If a reviewer has to ask "what does this do?", rename it.
12. **No secrets in code.** Environment variables only.

---

## Related Documents
- [Code Quality Guidelines](./CODE_QUALITY_GUIDELINES.md) — Quality standards, review checklist
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) — E2E development protocol
- [Features Guidelines](./FEATURES_GUIDELINES.md) — Feature scoping and delivery
- [UI Style Guide](./UI_STYLE_GUIDE.md) — Visual design system
- [UX Guidelines](./UX_GUIDELINES.md) — User experience patterns
