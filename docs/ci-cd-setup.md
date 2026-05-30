# CI/CD setup — deploy branches + Coolify



This repo uses **deploy branches** so Coolify only deploys commits that passed CI.



## Two GitHub repos (important)



| Repo | GitHub | Actions you see there |

|------|--------|------------------------|

| **Frontend** | `DarkHyperPK/Esportra` | CI — Frontend, Build & Deploy — Staging/Production |

| **Backend** | `DarkHyperPK/esportra-backend` | Build & Deploy — Staging/Production, PR check |



Backend workflows never appear in the frontend repo — open **Actions on each repo separately**.



## Branch model



| Branch | Purpose |

|--------|---------|

| `feature/*` | Your work |

| `staging` | Integration; CI tests here |

| `deploy/staging` | Coolify staging app watches this |

| `main` | Production-ready code |

| `deploy/main` | Coolify production app watches this |



You merge to `staging` or `main`. GitHub Actions tests, then updates `deploy/*`. Coolify auto-deploys from `deploy/*`.



## Workflow map (what runs when)



| Workflow | Repo | Trigger | Pass = | Fail = |

|----------|------|---------|--------|--------|

| **CI — Frontend** | FE | Push/PR to `staging`/`main` | Lint + build only (placeholders) | Code/lint/build broken |

| **Build & Deploy — Staging** | FE | Push `staging` | E2E preflight + stable Playwright (`@flaky` excluded) + promote | Misconfig **or** real test failure |

| **Build & Deploy — Production** | FE | Push `main` | Prod build + `@promotion` E2E + promote | Misconfig **or** real test failure |

| **CI — Config health check** | FE | Daily 08:00 UTC / manual | All E2E secrets + auth aligned | Secret drift / wrong password |

| **Build & Deploy — Staging/Production** | BE | Push `staging`/`main` | Build + migration replay + promote | Build/migration/smoke failure |



**Why CI passes but Deploy fails:** CI never runs Playwright or checks secrets. Deploy runs E2E — failures there are usually auth/env (preflight catches early) or real regressions.



## Failure auto-reporting



When a deploy workflow fails, a **Report failure** job:



1. Creates or updates a GitHub Issue labeled `ci-failure` with a link to the run

2. Optionally posts to `CI_NOTIFY_WEBHOOK_URL` (Slack incoming webhook, Discord, etc.)



Optional secret (both repos):



| Secret | Purpose |

|--------|---------|

| `CI_NOTIFY_WEBHOOK_URL` | POST JSON `{ "text": "..." }` on failure |



Issues appear in the **same repo** that failed. Watch the `ci-failure` label or enable GitHub email notifications for your account.



Run **CI — Config health check** manually (Actions → CI — Config health check → Run workflow) to validate secrets without pushing code.



## E2E preflight (no more cryptic timeouts)



Before Playwright runs, **E2E preflight** checks:



- All required secrets are set (lists missing names if not)

- Staging API `/health/ready` responds

- Organizer can sign in to Supabase

- API accepts that JWT (catches Supabase/API env mismatch → former 401s)

- `VITE_SUPABASE_URL` matches `E2E_SUPABASE_URL` (UI login uses same project)



Promotion E2E on `main` intentionally uses **staging API + staging Supabase** (test accounts live there). Prod URLs are only used for the post-deploy smoke step.



## One-time Coolify changes



For **each** app (staging FE, staging BE, prod FE, prod BE):



1. Open the app in Coolify → **Source** / Git settings.

2. Change the tracked branch:

   - Staging apps: `deploy/staging` (was `staging`)

   - Production apps: `deploy/main` (was `main`)

3. Save.



## GitHub secrets



### Backend (`esportra-backend`)



| Secret | Example |

|--------|---------|

| `E2E_STAGING_API_URL` | `https://api-staging.esportra.com` |

| `E2E_PROD_API_URL` | `https://backend.esportra.com` |

| `CI_NOTIFY_WEBHOOK_URL` | Optional Slack/Discord webhook |



### Frontend (`Esportra`)



| Secret | Example |

|--------|---------|

| `VITE_SUPABASE_URL` | Staging Supabase URL (must match E2E) |

| `VITE_SUPABASE_ANON_KEY` | Staging anon key |

| `VITE_API_URL` | Staging API URL |

| `VITE_PROD_SUPABASE_URL` | Production Supabase URL (prod build only) |

| `VITE_PROD_SUPABASE_ANON_KEY` | Production anon key (optional) |

| `VITE_PROD_API_URL` | Production API URL (optional) |

| `E2E_STAGING_BASE_URL` | `https://frontend-staging.esportra.com` |

| `E2E_STAGING_API_URL` | Staging API |

| `E2E_PROD_BASE_URL` | `https://esportra.com` |

| `E2E_PROD_API_URL` | Production API (smoke only) |

| `E2E_SUPABASE_URL` | Same Supabase as `VITE_SUPABASE_URL` |

| `E2E_SUPABASE_ANON_KEY` | Same anon key as staging frontend |

| `E2E_ORGANIZER_EMAIL` | Test organizer account |

| `E2E_ORGANIZER_PASSWORD` | Test organizer password |

| `E2E_PLAYER1_EMAIL` / `E2E_PLAYER1_PASSWORD` | Player 1 |

| `E2E_PLAYER2_EMAIL` / `E2E_PLAYER2_PASSWORD` | Player 2 |

| `CI_NOTIFY_WEBHOOK_URL` | Optional webhook |



See also [e2e/PROMOTION_TEST_PLAN.md](e2e/PROMOTION_TEST_PLAN.md) and [e2e/.env.example](../e2e/.env.example).



## Daily workflow



1. Merge feature → `staging`

2. Wait for **both** frontend and backend **Build & Deploy — Staging** green

3. Manual check on staging site

4. Cherry-pick / release branch → `main`

5. Wait for production deploy workflows green on both repos

6. Production updates from `deploy/main`



## Bootstrap deploy branches



```powershell

git push origin staging:deploy/staging

git push origin main:deploy/main

```



Run in **both** repos.



## Troubleshooting



| Symptom | Likely cause |

|---------|----------------|

| Preflight: missing secret | Add the listed secret in GitHub → Settings → Secrets |

| Preflight: organizer login failed | Wrong `E2E_ORGANIZER_PASSWORD` |
| Preflight: player 1 login failed | Wrong `E2E_PLAYER1_PASSWORD` |
| Preflight: player 2 login failed | Wrong `E2E_PLAYER2_PASSWORD` (BR/multi-player tests need both players) |

| Preflight: Supabase/API mismatch | `E2E_SUPABASE_URL` must match the Supabase project your API validates |

| Preflight: Vite/Supabase mismatch | Set `VITE_SUPABASE_URL` = `E2E_SUPABASE_URL` |

| Playwright timeout on sign-in | Usually fixed by preflight — re-run after secrets aligned |

| CI green, Deploy red | Expected when E2E fails; check `ci-failure` issue or Playwright artifact |

| `@flaky` Playwright failure | Not deploy-blocking; run with `npm run test:e2e:flaky` and fix outside the promotion gate |

| No backend Actions in frontend repo | Backend is `esportra-backend` — separate repo |

| Promote never ran | E2E or preflight failed — deploy branch not updated (safe) |

| Smoke skipped warning | `E2E_*_BASE_URL` not set — optional post-deploy check |

