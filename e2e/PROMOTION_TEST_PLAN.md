# Staging → main promotion E2E gate

Run before promoting frontend work to production:

```bash
npm run test:e2e:promotion
```

Triggered automatically on push to `main` via `.github/workflows/deploy-prod.yml`.

Staging full suite runs on push to `staging` via `.github/workflows/deploy-staging.yml`.

## `@promotion` specs (production-safe)

| Spec | Covers |
|------|--------|
| `e2e/tournament-browse-promotion.spec.ts` | Browse tabs, API filters, public tournament list |
| `e2e/promotion-organizer.spec.ts` | `/organizer/tournaments` loads, create link, no crash |

## `@staging-only` specs (staging full suite only)

Catalog, seasons, invitations, and extended BR suites. Not run on `main` promotion.

## CI secrets (GitHub Actions)

| Secret | Used for |
|--------|----------|
| `E2E_STAGING_API_URL` | Staging backend during pre-deploy E2E |
| `E2E_SUPABASE_URL` | Supabase auth URL |
| `E2E_SUPABASE_ANON_KEY` | Supabase anon key |
| `E2E_ORGANIZER_EMAIL` | Organizer test account |
| `E2E_ORGANIZER_PASSWORD` | Organizer password |
| `E2E_PLAYER1_EMAIL` | Player 1 email |
| `E2E_PLAYER1_PASSWORD` | Player 1 password |
| `E2E_PLAYER2_EMAIL` | Player 2 email |
| `E2E_PLAYER2_PASSWORD` | Player 2 password |
| `VITE_API_URL` | Build-time API URL for preview |
| `VITE_SUPABASE_URL` | Build-time Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Build-time anon key |

Copy values from `e2e/.env.example` for staging.
