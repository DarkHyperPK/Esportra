# PROJ-037 — Decisions

## CEO Approval (2026-09-28)
**Decision:** Approved with Option A on encryption conflict.

**CEO constraint:** No at-rest encryption for `payment_instructions` in this PR. The field is a manual fallback — organizers enter a bank account number or PayPal so participants can read it and send money. Plain TEXT is acceptable for now. Receipt bucket security fix (HIGH) proceeds as planned. Encryption deferred to a future security sprint.

**Implication:** Do NOT add any migration, pgcrypto, or encryption layer in this PR. Confirm RLS limits `payment_instructions` visibility to organizer + registered participants only — that's the compensating control.
