---
description: "Esportra security model — RLS, defense-in-depth, mandatory reviewer gates"
alwaysApply: true
---
# Esportra Security

Extends `common-security`. Security is **blocking**, not advisory.

## Read first

1. `.cursor/skills/esportra/references/security-model.md` — layers and non-negotiables
2. `.cursor/skills/esportra/references/security-gates.md` — which gate applies to your change
3. `project-guidelines/CODING_GUIDELINES.md` §3 and `CODE_QUALITY_GUIDELINES.md` §10

## Defense-in-depth (summary)

| Layer | Enforcement |
|-------|-------------|
| Postgres | RLS default deny + triggers on protected fields |
| Hooks | Parameterized Supabase calls; Zod before mutations |
| Components | No DB access; no secrets; safe HTML |
| Edge Functions | JWT every request |
| Review | **security-reviewer** + **database-reviewer** |

**Never** disable RLS, remove triggers, or use `USING (true)` on writes to unblock development.

## Mandatory agent activation

| You changed… | Agent (required) | Skill |
|--------------|------------------|-------|
| `supabase/migrations/` | database-reviewer, security-reviewer | `postgres-patterns`, `database-migrations` |
| RLS, auth, roles | security-reviewer | `security-review` |
| `src/hooks/` data access | security-reviewer if auth-sensitive | `backend-patterns` |
| Payments, PII, uploads | security-reviewer | `security-review` |
| `.cursor/` config | — | `security-scan` |

## Pre-commit minimum

- No hardcoded secrets
- `npm run build` passes
- RLS changes tested as **non-admin** user
- No weakened triggers (`trg_block_*`, booking payment triggers, storage policies)

## On security finding

1. STOP — no workaround that weakens Layer 1
2. **security-reviewer** agent
3. Fix CRITICAL/HIGH before continuing
4. Rotate exposed secrets
5. Grep for same pattern repo-wide

## Existing protections — do not touch

Tournament organizer field blocks, team invitation rules, match report participant checks, venue booking payment triggers, storage anonymous-write deny — see `security-model.md`.
