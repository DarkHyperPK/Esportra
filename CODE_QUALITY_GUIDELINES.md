# Esportra Code Quality Guidelines

> **Version 1.0** — Last Updated: March 2026
> Standards for writing code that's maintainable, safe, and reviewable.

---

## Table of Contents
1. [Quality Philosophy](#1-quality-philosophy)
2. [TypeScript Standards](#2-typescript-standards)
3. [Error Handling](#3-error-handling)
4. [Dependency Management](#4-dependency-management)
5. [Code Review Checklist](#5-code-review-checklist)
6. [Performance Budgets](#6-performance-budgets)
7. [Dead Code & Tech Debt](#7-dead-code--tech-debt)
8. [Testing Standards](#8-testing-standards)
9. [Git Hygiene](#9-git-hygiene)
10. [Security Checklist](#10-security-checklist)
11. [Rules](#11-rules)

---

## 1. Quality Philosophy

### Every line of code has a maintenance cost

Code isn't written once. It's read dozens of times, modified, debugged, and eventually replaced. Write for the person who reads it six months from now — that person might be you, and you won't remember why you wrote it that way.

### Principles

| Principle | Description |
|-----------|-------------|
| **Simplicity over cleverness** | A 10-line function that anyone can understand beats a 3-line one-liner that requires a PhD to parse. |
| **Explicit over implicit** | Name things clearly. Don't hide behavior behind abstractions. If a function deletes data, name it `deleteTeam`, not `handleAction`. |
| **Fail loudly** | Silent failures are the worst kind of bug. If something breaks, throw an error, log it, and show the user a message. |
| **Single responsibility** | A function does one thing. A component renders one concern. A hook manages one piece of state. |
| **Don't repeat yourself — but don't over-abstract either** | If you copy-paste the same 10 lines three times, extract a function. If you copy-paste 2 lines twice, just leave them. Premature abstraction is worse than duplication. |

---

## 2. TypeScript Standards

### Strictness
- `strict: true` in `tsconfig.json`. This enables `strictNullChecks`, `noImplicitAny`, and all other strict checks.
- Zero `// @ts-ignore` directives in production code. If you need one, you're fighting the type system instead of fixing the problem.
- Minimize `as` type assertions. They bypass the compiler. If you use one, leave a comment explaining why.

### The `any` policy
```typescript
// NEVER do this without explanation
const data: any = response;

// If you truly need it, explain WHY
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const legacyData: any = externalApi.response; // External API has no type definitions
```

Rule: every `any` needs a comment. If you can't explain why, you can find the real type.

### Interface vs Type
- Use `interface` for object shapes (database rows, component props, API responses).
- Use `type` for unions, intersections, and computed types.

```typescript
// Object shape → interface
interface TournamentRow {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'live' | 'completed';
  organizer_id: string;
}

// Union → type
type TournamentStatus = 'draft' | 'published' | 'live' | 'completed';

// Computed → type
type TournamentWithParticipants = TournamentRow & {
  participants: ParticipantRow[];
};
```

### Naming conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| **Interfaces** | PascalCase, descriptive | `TournamentParticipant`, `UserProfile` |
| **Types** | PascalCase | `MatchStatus`, `VetoAction` |
| **Functions** | camelCase, verb-first | `fetchTournament`, `handleSubmit`, `validateForm` |
| **Constants** | SCREAMING_SNAKE_CASE | `MAX_TEAM_SIZE`, `DEFAULT_PAGE_LIMIT` |
| **Boolean variables** | Prefix with `is`, `has`, `can`, `should` | `isLoading`, `hasPermission`, `canEdit` |
| **Event handlers** | Prefix with `handle` or `on` | `handleClick`, `onSubmit` |
| **Custom hooks** | Prefix with `use` | `useTeamManagement`, `useAuth` |

### Enums vs Union Types
Prefer union types over enums:
```typescript
// Prefer this
type MatchStatus = 'pending' | 'live' | 'completed' | 'disputed';

// Over this
enum MatchStatus {
  Pending = 'pending',
  Live = 'live',
  Completed = 'completed',
  Disputed = 'disputed',
}
```

Why: union types are simpler, tree-shake better, and work more naturally with Supabase's string-based column values.

---

## 3. Error Handling

### The layers

```
┌─────────────────────────────────────────────┐
│ Layer 1: Database (RLS + triggers)          │ ← Prevents bad data from existing
├─────────────────────────────────────────────┤
│ Layer 2: Custom hooks (try/catch + toast)   │ ← Catches API errors, shows feedback
├─────────────────────────────────────────────┤
│ Layer 3: Components (error boundaries)      │ ← Catches render errors
├─────────────────────────────────────────────┤
│ Layer 4: Global (unhandled rejections)      │ ← Last resort logging
└─────────────────────────────────────────────┘
```

### Patterns

**In custom hooks (Layer 2):**
```typescript
const updateScore = useMutation({
  mutationFn: async (score: ScoreUpdate) => {
    const { data, error } = await supabase
      .from('match_scores')
      .update(score)
      .eq('match_id', matchId);

    if (error) throw error; // Let TanStack Query handle it
    return data;
  },
  onError: (error: Error) => {
    // Specific, actionable message
    toast({
      title: 'Score update failed',
      description: error.message.includes('permission')
        ? 'You don\'t have permission to update this score.'
        : 'Could not save the score. Please try again.',
      variant: 'destructive',
    });
  },
});
```

**In components (Layer 3):**
```typescript
// Error boundary wraps route-level pages
<ErrorBoundary fallback={<ErrorFallback />}>
  <TournamentPage />
</ErrorBoundary>
```

### What NOT to do
```typescript
// BAD: swallowing errors silently
try {
  await submitScore();
} catch (e) {
  // nothing here — user has no idea it failed
}

// BAD: generic useless message
catch (e) {
  toast({ title: 'Error', description: 'Something went wrong' });
}

// BAD: console.log as error handling
catch (e) {
  console.log('error', e); // user sees nothing, developer might see it eventually
}
```

### Supabase error handling
Supabase returns `{ data, error }` — always check the `error`:
```typescript
const { data, error } = await supabase.from('teams').select('*');

// WRONG: ignore error, use possibly-null data
return data;

// RIGHT: check error, throw or handle
if (error) throw error;
return data;
```

---

## 4. Dependency Management

### Adding dependencies
Before adding a new package, answer these:
1. **Does the browser/Node already do this?** (e.g., `fetch` instead of `axios`, `structuredClone` instead of `lodash.cloneDeep`)
2. **Does an existing dependency already do this?** (e.g., Radix already provides accessible dialogs — don't add another modal library)
3. **How big is it?** Check bundle size on [bundlephobia.com](https://bundlephobia.com)
4. **Is it maintained?** Check the last commit date and open issues

### Current approved dependencies

| Category | Package | Purpose |
|----------|---------|---------|
| **UI** | `@radix-ui/*`, `shadcn/ui` | Accessible primitives |
| **Styling** | `tailwindcss`, `tailwind-merge`, `clsx` | CSS utilities |
| **State** | `@tanstack/react-query` | Server state |
| **Forms** | `react-hook-form`, `zod`, `@hookform/resolvers` | Form management + validation |
| **Animation** | `framer-motion` | UI animations |
| **Backend** | `@supabase/supabase-js` | Supabase client |
| **Routing** | `react-router-dom` | Client routing |
| **Date** | `date-fns` | Date formatting |
| **Charts** | `recharts` | Data visualization |
| **Icons** | `lucide-react` | Icon set |

### Don't add
- **Lodash** — use native JS methods. If you need one utility, write a 5-line function.
- **Moment.js** — we use `date-fns`. It's smaller and tree-shakeable.
- **Axios** — `fetch` is built-in. Supabase handles its own HTTP.
- **State management libraries** (Redux, Zustand, MobX) — TanStack Query handles server state. React context handles local state. We don't need a third system.

### Updating dependencies
- Run `npm audit` monthly. Fix critical/high vulnerabilities immediately.
- Major version bumps (e.g., React 18 → 19) need a dedicated PR with testing.
- Don't update dependencies in the same PR as feature work.

---

## 5. Code Review Checklist

### For every PR, verify:

**Correctness**
- [ ] Does it do what the ticket/task says?
- [ ] Are edge cases handled (null, empty, undefined)?
- [ ] Does it work for all relevant user roles?

**Security**
- [ ] New tables have RLS enabled and policies defined?
- [ ] No secrets or API keys in code?
- [ ] No raw user input in SQL queries or HTML?
- [ ] Sensitive fields are protected by triggers?

**Quality**
- [ ] No `any` types without comments?
- [ ] No `// @ts-ignore` or `eslint-disable` without comments?
- [ ] Error states are visible to the user, not silent?
- [ ] Loading states show skeletons or spinners?

**Performance**
- [ ] No N+1 query patterns?
- [ ] Lists use `.limit()` for pagination?
- [ ] Heavy components use lazy loading?
- [ ] No unnecessary re-renders (check React DevTools)?

**Maintainability**
- [ ] Functions are under 50 lines (prefer under 30)?
- [ ] Components are under 200 lines?
- [ ] File names match their exports?
- [ ] Custom hooks live in `src/hooks/`, not inline in components?

---

## 6. Performance Budgets

### Build size
| Metric | Budget | Action if exceeded |
|--------|--------|--------------------|
| **Initial JS bundle** | < 300KB gzipped | Code-split, lazy load routes |
| **Largest single chunk** | < 150KB gzipped | Break apart the module |
| **Total CSS** | < 50KB gzipped | Audit Tailwind purge config |

### Runtime
| Metric | Budget | Action if exceeded |
|--------|--------|--------------------|
| **First Contentful Paint** | < 1.5s | Check bundle size, lazy load |
| **Largest Contentful Paint** | < 2.5s | Optimize images, defer heavy components |
| **Supabase queries per page** | < 5 | Consolidate into RPCs |
| **Re-renders per interaction** | < 3 | Memo, useCallback, check dependencies |

### Database
| Metric | Budget | Action if exceeded |
|--------|--------|--------------------|
| **Query execution time** | < 100ms | Add indexes, optimize joins |
| **Rows returned per query** | < 100 (lists) | Paginate with `.limit()` + `.range()` |
| **RPC execution time** | < 200ms | Profile and optimize SQL |

---

## 7. Dead Code & Tech Debt

### Dead code policy
- If code is unused, delete it. Don't comment it out. Don't leave it "just in case." Git history preserves everything.
- If a component is replaced by a new one, delete the old one in the same PR.
- If a hook is no longer called anywhere, delete it.
- Run the build — if removing something causes no errors and no visible changes, it was dead code.

### Tech debt tracking
- When you encounter tech debt during feature work, don't fix it in the same PR. Note it as a comment: `// TODO: refactor — this duplicates logic in useTeamManagement`
- Tech debt fixes are separate, dedicated PRs. Don't mix them with feature work.
- Every `TODO` comment must include context about what needs to change and why.

### Refactoring rules
1. **Never refactor and add features in the same PR.** Refactoring should be behavior-preserving. Feature work changes behavior.
2. **Refactor only when it unblocks work.** Don't refactor for the sake of it. If the code works and nobody needs to change it, leave it alone.
3. **Verify after refactoring.** Run the build, check the browser, test the flow. Refactoring that introduces regressions is worse than the original mess.

---

## 8. Testing Standards

### What to test

| Level | What | How |
|-------|------|-----|
| **Database** | RLS policies, triggers, RPCs | Query as different roles in Supabase SQL editor |
| **Hooks** | Data fetching, mutations, error handling | Manual verification + Vitest (where possible) |
| **Components** | Render correctness, user interactions | Manual verification + Vitest with React Testing Library |
| **E2E flows** | Full user journeys (register → play → complete) | Manual QA checklist |

### Manual testing protocol
Before any merge to `staging`:
1. `npm run build` — passes with zero errors
2. Browser console — zero errors on the affected pages
3. Test the happy path as the relevant user role
4. Test at least one error path (network failure, permission denied, invalid input)
5. Test on mobile viewport (Chrome DevTools responsive mode)

### Automated testing (Vitest)
- Test utility functions and pure logic (bracket generation, veto service, score calculations).
- Test custom hooks using `renderHook` from React Testing Library.
- Don't test implementation details. Test behavior (what the user sees and does).

```typescript
// GOOD: tests behavior
test('tournament registration hook shows error when tournament is full', async () => {
  // setup: mock full tournament
  const { result } = renderHook(() => useTournamentRegistration(fullTournamentId));
  await result.current.register(teamId);
  expect(result.current.error).toBe('Tournament is full');
});

// BAD: tests implementation
test('hook calls supabase.from("tournaments")', () => { /* ... */ });
```

### What NOT to test
- Supabase client internals (they have their own tests)
- Third-party component behavior (Radix, shadcn)
- CSS/styling (use visual review instead)
- One-off scripts or migrations

---

## 9. Git Hygiene

### Commit messages
Conventional commits format. No exceptions.

```
<type>(<scope>): <description>

[optional body]
```

| Type | When to use |
|------|------------|
| `feat` | New feature for the user |
| `fix` | Bug fix |
| `chore` | Build, tooling, dependency updates |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `style` | Formatting, missing semi-colons, etc. |
| `perf` | Performance improvement |

Examples:
```
feat(tournament): add check-in countdown timer
fix(auth): handle expired refresh token gracefully
chore(deps): update @tanstack/react-query to 5.x
refactor(bracket): extract match scoring into separate hook
```

### Branch naming
```
feat/tournament-checkin
fix/auth-token-refresh
chore/update-dependencies
```

### PR rules
- One feature or fix per PR. Don't bundle unrelated changes.
- PR title follows the same `type(scope): description` format.
- Description includes: what changed, why, how to test.
- No PR should have more than 500 lines changed (excluding generated types). If it does, break it up.

### Merge strategy
- `staging` ← feature branches (squash merge or regular merge)
- `main` ← `staging` (merge commit to preserve history)
- Never force-push to `main` or `staging`.

---

## 10. Security Checklist

Run through this for every PR that touches data:

### Database
- [ ] New table has `ENABLE ROW LEVEL SECURITY`
- [ ] RLS policies default to deny (no `USING (true)` unless it's a public read table)
- [ ] Sensitive columns are protected by triggers (admin-only fields, payment status, etc.)
- [ ] RPCs that modify data use `SECURITY DEFINER` with explicit role checks inside

### Frontend
- [ ] No user input is interpolated into queries (use parameterized `.eq()`, `.match()`, etc.)
- [ ] No `dangerouslySetInnerHTML` unless sanitized with DOMPurify
- [ ] Auth tokens are not logged to console in production
- [ ] File uploads validate file type and size before sending
- [ ] No secrets in client-side code (check `.env` — only `VITE_` prefixed vars are safe)

### API / Edge Functions
- [ ] JWT is verified on every request
- [ ] Service role key is never exposed to the client
- [ ] CORS is configured (not `*` in production)
- [ ] Rate limiting is in place for public-facing endpoints

---

## 11. Rules

1. **`npm run build` must pass.** If it doesn't build locally, it won't build in production. Don't push broken code.
2. **Zero `any` without comments.** Every untyped value is a future bug. If you can't type it, explain why.
3. **No silent error handling.** Every `catch` block must either show a user-facing message or re-throw. Empty catch blocks are bugs.
4. **Functions under 50 lines.** If a function is longer, break it into smaller functions with clear names.
5. **Components under 200 lines.** If a component is longer, extract sub-components or custom hooks.
6. **One component per file.** File name matches component name. No exceptions.
7. **Custom hooks for all data fetching.** No raw Supabase calls in components. Ever.
8. **Every new table gets RLS.** If you create a table without RLS policies, it's a security vulnerability.
9. **Conventional commits.** Every commit message follows the `type(scope): description` format.
10. **Don't merge debt with features.** Refactoring and feature work are separate PRs.
11. **Delete dead code.** Commented-out code, unused imports, orphaned files — delete them. Git remembers.
12. **Dependencies are a last resort.** Before adding a package, check if the platform or an existing dependency already does what you need.

---

## Related Documents
- [Coding Guidelines](./CODING_GUIDELINES.md) — Code standards and patterns
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md) — E2E development protocol
- [Features Guidelines](./FEATURES_GUIDELINES.md) — Feature scoping and delivery
- [UI Style Guide](./UI_STYLE_GUIDE.md) — Visual design system
- [UX Guidelines](./UX_GUIDELINES.md) — User experience patterns
