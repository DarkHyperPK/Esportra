# Deployment workflow

Two branches, two environments. `staging` is where you develop and test. `main` is production. Each branch has its own GitHub Actions pipelines and its own self-hosted Supabase instance running on the same VPS (`84.235.246.82`).

---

## Environments

| | Staging | Production |
|---|---|---|
| **Branch** | `staging` | `main` |
| **Supabase URL** | `http://supabasekong-usoocgow4s0wow00gsw04kcg.84.235.246.82.sslip.io` | `https://api.esportra.com` |
| **Postgres port** | `5433` (on VPS) | `5432` (on VPS) |
| **Main site frontend** | `localhost:3000` (local dev against staging Supabase) | Coolify (auto-deploy on push to `main`) |
| **Partner portal frontend** | `localhost:5173` (local dev, hits staging Supabase) | `https://partner.esportra.com` (Coolify) |

---

## What happens when you push

### Push to `staging`

```
git push origin staging
        |
        v
   +----+---------------------------+
   |                               |
   v                               v
GitHub Action                 GitHub Action
(Staging DB Migrations)       (Staging Edge Functions)
   |                               |
   | SSH tunnel → port 5433        | SCP files via SSH
   | supabase db push --include-all| to staging volume
   v                               v
Schema updated                 Functions updated
```

No frontend deploy for staging. Run `npm run dev` locally — it already points to staging Supabase via `.env`.

### Push to `main`

```
git push origin main
        |
        v
   +----+----+--------------------+--------------------+
   |                              |                    |
   v                              v                    v
Coolify                    GitHub Action         GitHub Action
(Main site frontend)       (DB Migrations)       (Edge Functions)
   |                              |                    |
   | Pulls repo                   | SSH tunnel → 5432  | SCP files via SSH
   | npm run build                | supabase db push   | to production volume
   | Swaps container              |                    | chown permissions
   v                              v                    v
New UI live               Schema updated         Functions updated
```

All triggers fire independently based on which paths changed. On `main`, changing only `src/` triggers Coolify but not the DB action. Changing only `supabase/migrations/**` triggers only the DB action. On `staging`, only the DB and functions actions fire — there is no hosted frontend deploy.

---

## The deploy systems

### Frontend — `localhost:3000` (`staging`) + Coolify (`main`)

- **Staging**: No hosted frontend. Run `npm run dev` locally — `.env` is already pointed at staging Supabase. Test at `http://localhost:3000`.
- **Production**: Coolify watches `main`. On push it pulls the code, runs `npm run build`, and swaps the running container.

**Common Coolify failure:** After a server migration, the GitHub App webhook still points to the old IP. Fix it in Coolify dashboard > Sources > GitHub App > re-authenticate.

### Database migrations — GitHub Actions (both branches)

| Branch | Workflow | Tunnel | Secret |
|---|---|---|---|
| `staging` | `deploy-staging-migrations.yml` | local `5433` → VPS `5433` | `STAGING_DB_URL` |
| `main` | `deploy-migrations.yml` | local `5432` → VPS `5432` | `PROD_DB_URL` |

Both workflows open an SSH tunnel and run `supabase db push` through it. Staging uses `--include-all` to handle history drift after a prod→staging sync.

**Common failure:** Migration history drift. If `db push` fails with "already applied" or "unrecognized migration" errors, see the Troubleshooting section below.

### Edge Functions — GitHub Actions (both branches)

| Branch | Workflow | Volume path secret |
|---|---|---|
| `staging` | `deploy-staging-functions.yml` | `STAGING_FUNCTIONS_PATH` |
| `main` | `deploy-functions.yml` | hardcoded in workflow env |

Both workflows SCP `supabase/functions/` to the server and set `1000:1000` ownership.

**Common failure:** `SSH_PRIVATE_KEY` or `SERVER_IP` stale after a server migration. Trigger manually from the Actions tab if the path-based trigger didn't fire.

---

## Developer workflow

### Step 1 — Local dev against staging

Both the main site and partner portal hit **staging** Supabase in local dev. The `.env` files are already configured — don't change them.

```bash
# Terminal 1 — main site at http://localhost:3000
npm run dev

# Terminal 2 — partner portal at http://localhost:5173 (optional)
cd partner-portal && npm run dev
```

### Step 2 — Make your changes

Write code, add features, fix bugs. For database changes write a migration file:

```bash
# Option A — diff after making changes in staging Studio
supabase db diff -f describe_what_you_changed --db-url "postgresql://postgres:[STAGING_PASS]@localhost:54324/postgres"

# Option B — write SQL by hand
# supabase/migrations/<timestamp>_name.sql
```

Open the generated file. Read it. Confirm it does exactly what you intended.

### Step 3 — Push to staging and test

```bash
git add .
git commit -m "feat: describe what you built"
git push origin staging
```

GitHub Actions deploys the migration + functions automatically. Vercel deploys the frontend. Test everything on the staging site.

### Step 4 — Build check before promoting

```bash
npm run build
```

If this fails locally, production will also fail. Fix it first.

### Step 5 — Promote to production

```bash
git checkout main
git merge staging
git push origin main
```

Coolify, DB migrations, and Edge Functions all deploy in parallel. Coolify takes 1–2 minutes. Migrations and functions finish in under a minute.

---

## Syncing production data to staging

Use the sync script to copy production DB + storage into staging. Run this when staging data is stale or you need to reproduce a production bug:

```powershell
# Full sync (DB + storage)
.\scripts\sync_prod_to_staging.ps1

# DB only (faster)
.\scripts\sync_prod_to_staging.ps1 -SkipStorage
```

The script opens SSH tunnels, dumps production, restores to staging, re-applies Supabase schema grants (which `pg_dump --no-privileges` strips), and mirrors the storage bucket via MinIO.

After a sync, re-run any staging-only migrations that were overwritten:

```bash
git push origin staging  # triggers --include-all which re-applies them
```

---

## Querying databases directly

MCP tools are configured in `~/.claude/settings.json` for both environments. Before using them, open SSH tunnels in two terminal windows:

```powershell
# Terminal 1 — Production (local 54323 → VPS 5432)
ssh -i "$env:USERPROFILE\Downloads\esportra-dubai-ssh-key-2026-02-24.key" -N -L 54323:127.0.0.1:5432 ubuntu@84.235.246.82

# Terminal 2 — Staging (local 54324 → VPS 5433)
ssh -i "$env:USERPROFILE\Downloads\esportra-dubai-ssh-key-2026-02-24.key" -N -L 54324:127.0.0.1:5433 ubuntu@84.235.246.82
```

Then use `production-db` or `staging-db` MCP tools in Claude to run queries directly.

---

## Required GitHub secrets

Go to your repository on GitHub > Settings > Secrets and variables > Actions.

| Secret | Used by | Value |
|--------|---------|-------|
| `PROD_DB_URL` | `deploy-migrations.yml` | `postgresql://postgres:[PASSWORD]@[SERVER_IP]:5432/postgres` |
| `STAGING_DB_URL` | `deploy-staging-migrations.yml` | `postgresql://postgres:[PASSWORD]@[SERVER_IP]:5433/postgres` |
| `SERVER_IP` | all 4 workflows | Public IP of the VPS |
| `SERVER_USER` | all 4 workflows | SSH username (`ubuntu`) |
| `SSH_PRIVATE_KEY` | all 4 workflows | Private key authorized on the server |
| `STAGING_FUNCTIONS_PATH` | `deploy-staging-functions.yml` | Path to staging functions volume on server |

---

## When you change servers

1. Update `SERVER_IP` in GitHub Secrets.
2. Update `PROD_DB_URL` and `STAGING_DB_URL` if the IP or ports changed.
3. Update the SSH tunnel commands above with the new IP.
4. Go to Coolify dashboard > Sources > GitHub App > re-authenticate so the webhook URL points to the new server.
5. Make sure the new server has the SSH public key corresponding to `SSH_PRIVATE_KEY` in `authorized_keys`.

If you skip step 4, `git push` succeeds and GitHub shows green, but Coolify silently ignores it (webhook hits old IP).

---

## Troubleshooting

**Frontend deployed but database didn't update.**
Check if your migration file is in `supabase/migrations/`. If you made the change directly in Studio, there's no migration file and the Action had nothing to push.

**Edge Functions didn't deploy.**
The Action only triggers on changes to `supabase/functions/**`. If you only changed the workflow YAML, it won't fire. Trigger it manually from the Actions tab.

**Migration failed with "already applied" or "unrecognized migration".**
Migration history drifted — likely after a prod→staging sync overwrote the staging tracking table. For staging, the `--include-all` flag handles most cases. If it still fails, repair manually:

```bash
PGSSLMODE=disable supabase migration repair --status reverted <migration_id> --db-url "$TUNNELED_DB_URL"
```

Then re-trigger the workflow.

**Login works but profile/data doesn't load (permission denied for schema public).**
This happens after a prod→staging sync because `pg_dump --no-privileges` strips schema grants. The sync script now re-applies them automatically. If you see this after a manual restore, run:

```sql
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

**Everything deployed but the app shows stale data.**
Coolify might be serving a cached build. Force a redeploy from the Coolify dashboard. If it's a database issue, use the MCP tools to verify the expected table/column/function actually exists on production.

**Staging works but production doesn't.**
Confirm `.env.production` (main site) and `partner-portal/.env.production` both have the correct production Supabase URL and anon key.
