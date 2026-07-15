---
description: "Esportra architecture — layers, boundaries, hook-first data access"
globs:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "supabase/**"
alwaysApply: false
---
# Esportra Architecture

Applies when editing application structure, hooks, services, or database schema.

## Read first

`.cursor/skills/esportra/references/architecture.md`

## Layer rules

1. **Pages** compose; they do not call Supabase
2. **Components** render UI; they receive data via props or local UI state only
3. **Hooks** own all Supabase/React Query logic (`src/hooks/`)
4. **Services** own pure domain algorithms (`src/services/`)
5. **Schemas** own Zod validation (`src/schemas/`)
6. **Migrations** own schema + RLS + triggers (`supabase/migrations/`)

## Forbidden

```typescript
// In a component or page — NEVER
const { data } = await supabase.from('tournaments').select('*');
```

```typescript
// N+1 in a hook — NEVER
for (const id of ids) {
  await supabase.from('profiles').select('*').eq('id', id);
}
```

## Required patterns

- Joins or RPCs for related data — one round trip
- `.limit()` on every list query
- One component per file, <200 lines
- Functions <50 lines
- Path aliases `@/` for imports

## Feature build order

Migration (RLS) → types → schema → hook → components → page → verify as non-admin

## Significant decisions

Write ADR to `docs/architecture/decisions/ADR-NNNN-title.md` using `architecture-decision-records` skill.

Multi-PR work: `blueprint` skill → `plans/`

## Agents

| Situation | Agent |
|-----------|-------|
| New feature structure | planner |
| Cross-cutting design | architect |
| After structural change | code-reviewer |
| DB/schema change | database-reviewer |
