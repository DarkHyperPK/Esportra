---
description: "Enterprise-grade code — root-cause fixes, single source of truth, no patch helpers, mirrors, or compensating workarounds. Solves problems in the data path, not around it."
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "supabase/**/*.sql"]
alwaysApply: false
---

# Esportra Enterprise Code

> Extends `esportra-architecture` and `typescript-coding-style`. This rule governs HOW logic is structured when behavior is wrong or state must stay consistent. Security remains governed by `esportra-security`.

## Purpose

Code must be **robust by design**, not robust by patch. When behavior is wrong, fix the root cause in the data path. Never add a compensating helper, mirror, resolver, or workaround that papers over fragile logic — those decay the moment the underlying code changes.

## Banned: patchy patterns

### 1. Compensating helpers / resolvers
A function created solely to paper over a defect in existing logic — e.g., a comparator that hides a lossy string round-trip, or a resolver that re-derives state another layer already owns.

**Ban test:** if the underlying code were corrected, would this function disappear? If yes — it is a patch. Fix the underlying code instead.

### 2. Duplicated server state in components
Mirroring server values into local state (e.g., copying `scheduled_at` into component state after a save) and manually keeping it in sync.

**Correct:** server state lives in the query cache (React Query). Mutations invalidate and refetch. Components hold only genuinely local form state.

### 3. String round-trip comparisons
Comparing a raw user string against a value that was reformatted for display or storage (e.g., `typedInput !== utcToLocalInput(persisted)`). Formatting is lossy (timezones, DST, precision) — comparing formatted strings compares two representations, not one value.

**Correct:** adopt one canonical form at the boundary and compare canonical-to-canonical, or compare the underlying value directly (e.g., the instant, not its rendering).

### 4. Symptom patches
Fixing where the bug is visible instead of where the data first diverges.

### 5. Workarounds that assume other-layer behavior
Logic that compensates for what a layer *might* do ("in case the API normalizes…"). Verify the other layers; if behavior is confirmed, code against it directly. If a layer is unreachable, label the assumption — do not patch for it.

### 6. Architecture bypasses
Data fetching or Supabase/API calls inside components instead of hooks; business logic duplicated instead of shared.

## Required: enterprise patterns

### Single source of truth
- **Server data:** query cache, invalidated on mutation. No mirrors, no duplicate fetches in components.
- **Form input:** local state at the boundary, normalized on accept/save.

### Normalize at the boundary
Convert values to their canonical form when they enter state (parse/validate once at the entry point). Store, render, and compare canonical values. Never compare against a freshly reformatted string.

### Mutations invalidate, they don't mirror
After a successful mutation: invalidate the affected query keys, refetch, and report the true outcome — partial success reported as partial, never as a blanket error.

### Root-cause discipline
Locate the first hop where data diverges from the intended workflow and fix it there. Use the `root-cause-diagnosis` skill to trace, `tdd-workflow` to fix (RED → GREEN → refactor), and `verification-loop` before committing.

### Real functions are not helpers
A named, single-purpose, tested function that models domain logic (validators, formatters, converters, pure algorithms) living in the established module structure (`src/lib/`, `src/utils/`, `src/services/`, `src/schemas/`) is a **domain function** — required, not banned. The ban targets anonymous/ad-hoc functions that exist only to compensate for defects.

### Deterministic and idempotent
The same inputs produce the same outcome; repeating an operation (double-click, retry, re-save) is safe and converges to the same state.

## Self-audit before commit

- [ ] Is this the root cause, or a patch over it? (Apply the ban test.)
- [ ] Is server state duplicated anywhere? (Mirror → remove; use the query cache.)
- [ ] Are we comparing canonical-to-canonical? (No string round-trips.)
- [ ] Does the fix survive a refetch, a remount, and a second mutation?
- [ ] Are error paths truthful (partial failure reported as partial)?
- [ ] Does the logic follow the layer rules (hooks own data, services own domain)?
- [ ] Is the operation idempotent / deterministic?
- [ ] Would this break if the backend stopped being forgiving?
- [ ] Do tests cover the edge that motivated the change (validated RED → GREEN)?
- [ ] `npm run build`, `tsc --noEmit`, `npm run lint`, and the relevant tests pass?

## Consequence

A patchy fix caught in review is rejected and redone at the root cause. This is not negotiable.
