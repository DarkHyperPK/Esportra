# Esportra Security Model

Defense-in-depth for a Supabase + React platform handling tournaments, payments-adjacent data, and user-generated content.

**Authority:** `project-guidelines/CODING_GUIDELINES.md` §3, `CODE_QUALITY_GUIDELINES.md` §10.

## Security layers (outer → inner)

```
Layer 5: Harness / CI        security-reviewer, security-scan, lint, build
Layer 4: Edge Functions      JWT on every request; service role server-only
Layer 3: Frontend            Zod validation, no secrets, safe rendering
Layer 2: Hooks               Parameterized queries; no trust of client role
Layer 1: Postgres            RLS default deny + triggers on protected fields
Layer 0: Storage buckets     No anonymous write; path policies per bucket
```

**Never weaken Layer 1 to fix a Layer 3 bug.** Fix the policy or hook, don't disable RLS.

## Non-negotiables

1. **Never trust the client** — role, ownership, and eligibility enforced in RLS/RPC
2. **Every table has RLS** — `ENABLE ROW LEVEL SECURITY` before any policy
3. **Default deny** — explicit `USING` / `WITH CHECK`; no `USING (true)` on writes
4. **Admin mutations via `SECURITY DEFINER` RPCs** — with explicit role checks inside the function body
5. **Edge Functions verify JWT** on every request
6. **Service role key never in client** — only anon key in `VITE_*` env
7. **Test as non-admin** — service role bypasses RLS; admin testing proves nothing

## Protected fields (do not remove triggers)

Existing protections documented in CODING_GUIDELINES — **never weaken**:

| Area | Protection |
|------|------------|
| Tournaments | Organizers cannot set `is_featured`, `status`, `approved_by`, `approved_at`, `winner_id` (`trg_block_organizer_tournament_updates`) |
| Teams | Members join only with accepted invitation |
| Match reports | Reporter must be match participant |
| Venue bookings | Payment fields protected by trigger |
| Storage | No anonymous write on any bucket |

When touching these domains, read the migration/trigger before changing policies.

## RLS template for new tables

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_or_public" ON your_table
  FOR SELECT USING (
    auth.uid() = user_id
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

CREATE POLICY "insert_own" ON your_table
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
  );

-- Add UPDATE/DELETE with same ownership pattern
```

Adjust for public-read tables (e.g. published brackets) — SELECT may be wider; writes stay narrow.

## Frontend security

| Risk | Mitigation |
|------|------------|
| XSS | No `dangerouslySetInnerHTML` without DOMPurify; see `web-security` rule |
| Injection | Supabase client methods only — `.eq()`, never string-built filters |
| Secrets in bundle | Only `VITE_*` in client; rotate if leaked |
| Auth tokens | Never `console.log` session/JWT in production |
| File upload | Validate type, size, extension in hook before upload |
| CSRF | Supabase Auth handles session; state-changing forms use authenticated client |

## Input validation

- **Zod at boundaries** — forms, mutation payloads, route params where user-controlled
- Schemas in `src/schemas/` — reuse between hook and form
- Reject invalid input before Supabase call; don't rely on DB error messages for UX

## Error handling (security-aware)

- User-facing: generic, actionable ("You don't have permission")
- Server/logs: detailed context — never expose stack traces, SQL, or paths to client
- No empty `catch` blocks — silent failures hide security denials

## Agents & skills (mandatory triggers)

| Change type | Before merge |
|-------------|--------------|
| New table / RLS / RPC | `postgres-patterns`, **database-reviewer**, **security-reviewer** |
| Auth, roles, payments | **security-reviewer**, `security-review` |
| Edge Function | **security-reviewer**, JWT verification checklist |
| User input / upload | `security-review` § Input Validation |
| `.cursor/` or hooks config | `security-scan` |
| Any PR touching `supabase/` or `src/hooks/` | Run `verification-loop` Phase 1–5 |

## Security response protocol

1. **STOP** — do not ship workaround that disables RLS/triggers
2. **security-reviewer** agent — full pass
3. Fix CRITICAL/HIGH first
4. **Rotate** any exposed secret immediately
5. Grep codebase for same anti-pattern

## Related skills

- `security-review` — comprehensive checklist
- `security-scan` — audit `.cursor/` and agent config
- `postgres-patterns` — indexing + RLS performance
- `database-migrations` — safe migration workflow
- `api-design` — RPC and API surface shape
