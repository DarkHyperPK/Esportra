# PROJ-036 Decisions

## CEO Approval — 2026-09-28

Approved full scope including RLS SELECT policy on tournament_disputes.

**CEO rationale:** "We work what makes our product solid. No need to go for shortcuts that harm in future."

## Scope confirmed

- Fix list endpoint (tournament_id filter + authz pre-flight)
- Fix single-dispute IDOR (ownership check)
- Fix comments POST (isOrganizer path)
- Remove client-side .filter() in frontend
- Remove Riot PUUIDs from list response
- Add SELECT RLS policy on tournament_disputes (migration)
