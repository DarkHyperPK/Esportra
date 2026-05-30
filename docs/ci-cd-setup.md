# CI/CD setup — deploy branches + Coolify

This repo uses **deploy branches** so Coolify only deploys commits that passed CI.

## Branch model

| Branch | Purpose |
|--------|---------|
| `feature/*` | Your work |
| `staging` | Integration; CI tests here |
| `deploy/staging` | Coolify staging app watches this |
| `main` | Production-ready code |
| `deploy/main` | Coolify production app watches this |

You merge to `staging` or `main`. GitHub Actions tests, then updates `deploy/*`. Coolify auto-deploys from `deploy/*`.

## One-time Coolify changes

For **each** app (staging FE, staging BE, prod FE, prod BE):

1. Open the app in Coolify → **Source** / Git settings.
2. Change the tracked branch:
   - Staging apps: `deploy/staging` (was `staging`)
   - Production apps: `deploy/main` (was `main`)
3. Save. No webhook change required — Coolify still deploys on push, but only to `deploy/*`.

## GitHub secrets

### Backend

| Secret | Example |
|--------|---------|
| `E2E_STAGING_API_URL` | `https://api-staging.esportra.com` |
| `E2E_PROD_API_URL` | `https://backend.esportra.com` |

### Frontend

| Secret | Example |
|--------|---------|
| `VITE_SUPABASE_URL` | Staging Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Staging anon key |
| `VITE_API_URL` | Staging API URL |
| `VITE_PROD_SUPABASE_URL` | Production Supabase URL (optional) |
| `VITE_PROD_SUPABASE_ANON_KEY` | Production anon key (optional) |
| `VITE_PROD_API_URL` | Production API URL (optional) |
| `E2E_STAGING_BASE_URL` | `https://frontend-staging.esportra.com` |
| `E2E_STAGING_API_URL` | Staging API |
| `E2E_PROD_BASE_URL` | `https://esportra.com` |
| `E2E_PROD_API_URL` | Production API |
| `E2E_SUPABASE_URL` | For Playwright auth |
| `E2E_SUPABASE_ANON_KEY` | For Playwright auth |
| `E2E_ORGANIZER_EMAIL` | Test organizer account |
| `E2E_ORGANIZER_PASSWORD` | Test organizer password |
| `E2E_PLAYER1_EMAIL` | Test player 1 |
| `E2E_PLAYER1_PASSWORD` | Test player 1 password |
| `E2E_PLAYER2_EMAIL` | Test player 2 |
| `E2E_PLAYER2_PASSWORD` | Test player 2 password |

See also [e2e/PROMOTION_TEST_PLAN.md](e2e/PROMOTION_TEST_PLAN.md).

## Workflows

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci-frontend.yml` | PR / push | Lint + build (fast) |
| `deploy-staging.yml` | Push `staging` | Build, full E2E, promote `deploy/staging`, smoke |
| `deploy-prod.yml` | Push `main` | Build, `@promotion` E2E, promote `deploy/main`, smoke |

Backend (`esportra-backend`): `deploy-staging.yml` / `deploy-prod.yml` run migration checks then promote.

## Daily workflow

1. Merge feature → `staging`
2. Wait for GitHub Actions green on staging deploy workflow
3. Open staging site — manual check of new work
4. Promote selected commits to `main` (cherry-pick / release branch)
5. Wait for production workflow green
6. Production updates from `deploy/main`

## Bootstrap deploy branches

After first push of these workflows, create deploy branches from current live SHAs:

```powershell
git push origin staging:deploy/staging
git push origin main:deploy/main
```

Run in both frontend and backend repos.

## Troubleshooting

- **Staging didn't update after merge to `staging`:** Check Actions log; promote step only runs if tests pass. Re-run workflow from Actions tab if an empty commit did not trigger the pipeline (path filters require file changes).
- **Coolify still deploys on `staging` push:** Coolify branch not switched to `deploy/staging` yet.
- **E2E skipped:** Add GitHub secrets listed above.
- **Double deploy:** Ensure Coolify watches `deploy/*` only, not both `staging` and `deploy/staging`.
