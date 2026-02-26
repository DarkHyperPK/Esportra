# Deployment workflow

How code gets from your machine to production. Three systems run in parallel when you push to `main`. If any of them aren't set up correctly, things break silently -- the frontend deploys but the database doesn't have the new table, or the Edge Function is still running last week's code.

---

## What happens when you push

```
git push origin main
        |
        v
   +----+----+--------------------+--------------------+
   |                              |                    |
   v                              v                    v
 Coolify                    GitHub Action         GitHub Action
 (Frontend)                 (DB Migrations)       (Edge Functions)
   |                              |                    |
   | Pulls repo                   | supabase db push   | SCP files via SSH
   | npm run build                | against PROD_DB_URL | to server volume
   | Swaps container              |                    | chown permissions
   v                              v                    v
 New UI live               Schema updated         Functions updated
```

Three things deploy. If you only changed frontend code, only Coolify runs. If you only changed a migration file, only the DB action runs. They're independent.

---

## The three systems

### Frontend (Coolify)

Coolify watches your GitHub repo through the official GitHub App integration. When it sees a push to `main`, it pulls the code, runs `npm run build`, and swaps the running container.

**Trigger:** Any push to `main`.

**What deploys:** React components, pages, CSS, routing, Vite config -- everything in `src/` and `public/`.

**Common failure:** If you recently changed your server (new VPS, new IP), the GitHub App webhook URL still points to the old IP. Fix this in the Coolify dashboard under Sources > GitHub App > re-authenticate or update the webhook URL.

### Database schema (GitHub Actions)

The workflow file is `.github/workflows/deploy-migrations.yml`. It installs the Supabase CLI and runs `supabase db push --db-url $PROD_DB_URL` against your production Postgres instance.

**Trigger:** Pushes to `main` that include changes in `supabase/migrations/**`.

**What deploys:** New tables, columns, RLS policies, triggers, and RPC functions -- anything captured in a `.sql` migration file.

**Common failure:** The `PROD_DB_URL` secret is wrong or the database port isn't exposed. Also, if you made changes directly in the production Supabase Studio UI, the migration might conflict.

### Edge Functions (GitHub Actions)

The workflow file is `.github/workflows/deploy-functions.yml`. It connects to your server via SSH and copies the `supabase/functions/` directory into the production volume.

**Trigger:** Pushes to `main` that include changes in `supabase/functions/**`.

**What deploys:** Backend serverless functions (Riot OAuth, email sending, webhook handlers, API proxies).

**Common failure:** The `SERVER_IP` secret is stale after a server migration. Also check that `SSH_PRIVATE_KEY` matches a key authorized on the server.

---

## Developer workflow

### 1. Start local dev

```bash
supabase start    # spins up local Postgres, Auth, Storage on port 54322
npm run dev       # starts Vite dev server
```

Your local Supabase Studio is at `http://localhost:54323`. Your app is at `http://localhost:5173` (or whatever Vite assigns).

### 2. Make database changes locally

Change whatever you need in the local Supabase Studio or via SQL. Add columns, write RLS policies, create functions. Then capture it:

```bash
supabase db diff -f describe_what_you_changed
```

This creates a timestamped `.sql` file in `supabase/migrations/`. Open it. Read it. Make sure it does what you think it does. The diff tool is good but not perfect -- sometimes it generates unnecessary `ALTER` statements or misses dependent objects.

### 3. Test Edge Functions locally (if applicable)

```bash
supabase functions serve my-function-name
```

Hit it with `curl` or from your local frontend. Check the logs for errors.

### 4. Build and verify

```bash
npm run build
```

If this fails, production will also fail. Fix it before pushing. Check the browser console for runtime errors too -- TypeScript compilation passing doesn't mean the app works.

### 5. Push

```bash
git add .
git commit -m "feat: add points system to user profiles"
git push origin main
```

The three systems take over from here. Coolify typically finishes the frontend build in 1-2 minutes. The database migration runs in a few seconds. Edge Functions copy over in under a minute.

---

## Required GitHub secrets

Go to your repository on GitHub > Settings > Secrets and variables > Actions.

| Secret | Used by | Value |
|--------|---------|-------|
| `PROD_DB_URL` | `deploy-migrations.yml` | `postgresql://postgres:[PASSWORD]@[SERVER_IP]:5432/postgres` |
| `SERVER_IP` | `deploy-functions.yml` | The public IP of your Coolify VPS |
| `SERVER_USER` | `deploy-functions.yml` | SSH username (usually `root`) |
| `SSH_PRIVATE_KEY` | `deploy-functions.yml` | Private key authorized on the server |

---

## When you change servers

This has bitten us before. If you move to a new VPS:

1. Update `SERVER_IP` in GitHub Secrets.
2. Update `PROD_DB_URL` in GitHub Secrets if the IP or port changed.
3. Go to Coolify dashboard > Sources > your GitHub App > re-authenticate so the webhook URL points to the new server.
4. Make sure the new server has the SSH public key corresponding to `SSH_PRIVATE_KEY` in its `authorized_keys`.

If you skip step 3, `git push` will succeed and GitHub will show a green checkmark, but Coolify won't know about it. The webhook response will be a 302 redirect to `/login`, which means GitHub is hitting the dashboard URL instead of the API endpoint.

---

## Troubleshooting

**Frontend deployed but database didn't update.**
Check if your migration file is in `supabase/migrations/`. If you made the change directly in the Studio UI, there's no migration file, and the GitHub Action had nothing to push.

**Edge Functions didn't deploy.**
The Action only triggers on changes to `supabase/functions/**`. If you only changed the workflow YAML file, it won't fire. Trigger it manually from the Actions tab on GitHub (the workflow has `workflow_dispatch` enabled).

**Everything deployed but the app shows stale data.**
Coolify might be serving a cached build. Force a redeploy from the Coolify dashboard. If it's a database issue, connect via the MCP tool and check that the expected table/column/function actually exists on production.

**Migration failed with a conflict.**
Someone (or something) changed the production schema outside the migration system. Connect to production, figure out what changed, and either write a new migration that accounts for the current state or manually fix the drift and re-run.
