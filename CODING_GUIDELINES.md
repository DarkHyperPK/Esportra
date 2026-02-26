# Coding guidelines for Esportra

These are the rules for writing code in this codebase. If you're contributing (human or AI), read this first. It's not optional.

---

## Why this document exists

We've hit real problems from sloppy code making it to production. Database calls that fire 12 times when once would do. Security holes that let unauthenticated users write to storage buckets. Frontend components that silently swallow errors and show "0" instead of telling anyone something broke.

This document exists because we learned those lessons the hard way. Follow it.

---

## Performance

### Write less code, not more

Every line you add is a line someone has to debug later. Before writing a new utility, check if one already exists. Before adding a library, check if the browser API does what you need. A 200-line component that does one thing well beats a 50-line component that imports four libraries to do the same thing.

### Database calls are expensive. Treat them that way.

This is probably the single biggest performance issue we've had. Here's what went wrong and how to avoid it:

**Consolidate queries.** If you need five counts from five tables, don't make five separate requests. Write a single RPC function that returns all of them in one round trip. We did exactly this with `get_admin_dashboard_stats()` -- one call replaced twelve.

```typescript
// wrong: fires 5 separate requests
const users = await supabase.from('profiles').select('*', { count: 'exact' });
const venues = await supabase.from('venues').select('*', { count: 'exact' });
const tournaments = await supabase.from('tournaments').select('*', { count: 'exact' });
// ... and so on

// right: one RPC, one round trip
const { data } = await supabase.rpc('get_admin_dashboard_stats');
```

**Use Supabase joins, not manual lookups.** If you need a tournament with its participants, use the nested select syntax. Don't fetch the tournament, then loop through participant IDs making individual profile requests.

```typescript
// wrong: N+1 query pattern
const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', id).single();
for (const pid of tournament.participant_ids) {
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', pid).single();
}

// right: let Postgres do the join
const { data } = await supabase
  .from('tournaments')
  .select('*, tournament_participants(*, profiles(username, avatar_url))')
  .eq('id', id)
  .single();
```

**Cache things that don't change often.** Game metadata from external APIs (like RAWG) should be cached. User profiles can be cached for short periods. Tournament brackets mid-match should not be cached.

**Paginate everything.** Never call `.select('*')` without a `.limit()`. If you're displaying a list, fetch one page at a time. The audit logs page fetches 100 rows max and paginates from there.

### Frontend performance

- Lazy load routes. Not every user visits the admin dashboard. Don't make them download the code for it.
- Use `React.memo` and `useCallback` where re-renders are measurable, not everywhere. Premature memo-ization makes code harder to read for no gain.
- Images should be served from Supabase Storage with transforms (resizing, WebP conversion) where supported.
- Debounce search inputs. A 300ms debounce on the user search saves dozens of unnecessary queries.

---

## Security

### The rules are simple

1. Never trust the client.
2. Every database table has Row Level Security enabled. No exceptions.
3. Every RLS policy defaults to deny. You add permissions, not remove restrictions.
4. Admin operations go through `SECURITY DEFINER` RPC functions, not direct table updates. RLS blocks admin updates to other users' rows by design -- that's the point.
5. Edge Functions verify the JWT on every request. Copy the pattern from `riot-match-proxy/index.ts` if you're writing a new one.

### What we've already locked down

We ran a full security audit and these are the protections in place. Don't remove them, don't weaken them, don't "temporarily disable" them:

- **Tournament organizers** cannot set `is_featured`, `status`, `approved_by`, `approved_at`, or `winner_id` on their own tournaments. There's a trigger (`trg_block_organizer_tournament_updates`) that blocks it.
- **Team members** can only join if they have an accepted invitation. No more self-inserting into teams.
- **Match reports** can only be submitted by players who are actually in the match.
- **Venue bookings** have payment fields protected by a trigger. Users cannot set their own booking to "paid."
- **Storage buckets** have no anonymous write access. The `Temp Allow Anon ALL` policy was dropped.
- **Edge Functions** all require JWT auth or service-role verification. The Riot OAuth flow uses PKCE-style state validation.

### Writing new RLS policies

When you add a new table:

1. Enable RLS: `ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;`
2. Add a SELECT policy for who can read.
3. Add an INSERT policy with a `WITH CHECK` clause.
4. Add UPDATE/DELETE policies as needed.
5. Always include a `service_role` bypass if backend operations need full access.
6. Test the policy by signing in as a non-admin user and trying to do things you shouldn't be able to.

```sql
-- Pattern for a basic RLS policy
CREATE POLICY "users_can_read_own_data" ON your_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_data" ON your_table
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );
```

### Secrets

- Database passwords, API keys, and SSH keys live in GitHub Secrets or Coolify environment variables. Never in code, never in `.env` files committed to git.
- The `.env.local` file is gitignored. Use it for local development only.
- If you need a new secret for a GitHub Action, add it in the repo settings under `Secrets and variables > Actions`.

---

## Database migrations

All schema changes go through the migration system. This matters because the production database auto-syncs from the `supabase/migrations/` folder via GitHub Actions.

### The workflow

1. Make your change on the local Supabase instance (localhost:54322).
2. Run `supabase db diff -f describe_what_you_changed` to capture it.
3. Check the generated `.sql` file. Make sure it does what you expect.
4. Commit the file along with your frontend code.
5. Push to `main`. The GitHub Action runs `supabase db push` against production automatically.

### Do not

- Edit the production database directly through the Supabase Studio UI. Changes made there won't exist in your migration history and will get overwritten or conflict.
- Write migrations that drop data without a backup plan.
- Combine unrelated changes in one migration file. If you're adding a column and also changing an RLS policy, make two separate migration files.

---

## Code style

### TypeScript

- Use TypeScript for everything. No `.js` files in `src/`.
- Define interfaces for all data shapes that come from the database. The `UserProfile` interface in `types/auth.ts` is the reference pattern.
- Don't use `any` unless you genuinely don't know the type and can't figure it out. If you write `as any`, leave a comment explaining why.

### React components

- One component per file. The filename matches the component name.
- Hooks go in `src/hooks/`. Context providers go in `src/contexts/`.
- Error states in data-fetching components should be visible, not silent. If a query fails, show a message. Don't render an empty page and hope nobody notices.

### Naming

- Database columns: `snake_case`
- TypeScript variables and functions: `camelCase`
- React components: `PascalCase`
- CSS classes: whatever you're already using in that file (we use a mix of Tailwind and custom classes)
- Be descriptive. `handleUnsuspendUser` beats `handleClick2`. `fetchTournamentWithParticipants` beats `getData`.

---

## Writing for humans

All documentation, user-facing text, error messages, and comments should be written in plain, direct language. We use a humanizer checklist (see `SKILL.md` in the repo root) to catch AI-sounding patterns. Here are the ones that matter most for this codebase:

### Drop the filler

Don't write "in order to" when "to" works. Don't write "it is important to note that" when you can just state the thing. Every word should earn its place.

### Be specific

"The API returned an error" is useless. "The Supabase RPC `get_admin_dashboard_stats` returned a 42501 permission denied error" is useful. Same goes for comments, commit messages, and toast notifications.

### Don't inflate importance

Code comments don't need to explain that a function "plays a key role in the overall architecture." Just say what it does. "Fetches the user's profile and checks the suspension flag" is enough.

### Error messages should help

A user seeing "Something went wrong" can't do anything with that. A user seeing "Your session expired. Please sign in again." knows exactly what happened and what to do.

### Commit messages

Use the conventional commits format: `fix:`, `feat:`, `chore:`, `docs:`. Keep the first line under 72 characters. If you need to explain more, add a blank line and a body paragraph.

```
fix(admin): pass correct username to audit log on unsuspend

The unsuspend action used selectedUser state which was null for
inline dropdown actions. Changed to pass the name directly from
the user row data.
```

---

## Testing before pushing

1. Run `npm run build` locally. If it doesn't build, it won't build on Coolify either.
2. Check the browser console for errors. Especially after touching auth flows or admin pages.
3. If you changed a database function or RLS policy, test it with a non-admin user. The admin service role bypasses everything, so testing as admin proves nothing about your policy.
4. If you changed an Edge Function, test it with `supabase functions serve` before pushing.

---

## When something breaks in production but works locally

This has happened to us. Here's the checklist:

1. **Missing database objects.** Did you create a new function or trigger locally but forget to run `supabase db diff`? Check if the migration file exists in `supabase/migrations/`.
2. **RLS blocking legitimate access.** Connect to production via the MCP tool and run the query as the affected user's role. Local Supabase often runs with more permissive defaults.
3. **Environment variables.** Does the Edge Function expect a secret that exists locally but hasn't been added to the production environment?
4. **Stale cache.** Coolify sometimes serves old builds. Force a manual redeploy from the dashboard.
5. **Different data.** Production has real users with real edge cases. A null `username`, a missing `avatar_url`, a profile created before the `suspension_type` column existed. Handle nulls.
