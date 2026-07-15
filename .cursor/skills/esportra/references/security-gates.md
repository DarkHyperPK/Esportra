# Esportra Security Gates

Run the appropriate gate before commit/PR based on what changed.

## Gate A — Every commit

| Check | Command / action |
|-------|------------------|
| Build | `npm run build` |
| Lint | `npm run lint` |
| No secrets in diff | Review for `sk-`, `eyJ`, passwords, `service_role` in client files |
| Conventional commit | `type(scope): description` under 72 chars |

## Gate B — Frontend (`src/`)

| Check | Skill / rule |
|-------|--------------|
| No raw Supabase in components | `esportra/references/architecture.md` |
| Zod on user input | `src/schemas/` |
| Error states visible | `CODING_GUIDELINES` §6 |
| XSS / CSP | `web-security` rule |
| Type safety | `typescript-*` rules |

Activate: `frontend-patterns`, `coding-standards`

## Gate C — Database (`supabase/migrations/`)

| Check | Required |
|-------|----------|
| `ENABLE ROW LEVEL SECURITY` on new tables | Yes |
| Policies for SELECT, INSERT, UPDATE, DELETE as needed | Yes |
| Triggers on admin/payment fields | If applicable |
| `SECURITY DEFINER` RPCs have internal role checks | Yes |
| Tested as non-admin user | Yes — document in PR |
| One migration per concern | Yes |

Activate: `database-migrations`, `postgres-patterns`  
Agents: **database-reviewer**, **security-reviewer**

## Gate D — Auth / payments / PII

| Check | Required |
|-------|----------|
| RLS covers all new access paths | Yes |
| No client-side role elevation | Yes |
| No PII in logs or error messages | Yes |
| Existing triggers untouched | Yes |

Activate: `security-review` (full checklist)  
Agent: **security-reviewer** (blocking)

## Gate E — Pre-PR (full verification)

Run `verification-loop` skill:

1. `npm run build`
2. `npx tsc --noEmit`
3. `npm run lint`
4. `npx vitest` (if tests exist for changed area)
5. Manual role test for RLS changes

Agent: **code-reviewer** after gates pass

## Gate F — Architecture change

| Check | Action |
|-------|--------|
| ADR written | `docs/architecture/decisions/ADR-NNNN-*.md` |
| Blueprint for multi-PR | `blueprint` skill → `plans/` |
| IMPLEMENTATION_GUIDE phases 1–4 done | For features |

Agents: **planner**, **architect**

## PR description template (security section)

```markdown
## Security
- [ ] RLS tested as non-admin (or N/A)
- [ ] No new secrets in code
- [ ] Triggers/policies not weakened
- [ ] User input validated with Zod
- [ ] security-reviewer pass (or N/A — docs only)
```

## Harness config hygiene

After editing `.cursor/hooks.json`, `.cursor/rules/`, or skills:

```bash
npx ecc-agentshield scan .cursor
```

Use `security-scan` skill for interpretation of findings.
