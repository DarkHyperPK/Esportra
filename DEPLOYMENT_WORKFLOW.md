# 🚀 Esportra Deployment Architecture

This document explains how the Continuous Integration and Continuous Deployment (CI/CD) pipeline works for Esportra. The environment is split between your **Local Dev Environment** and your **Production Environment** (Hosted on Coolify).

---

## 🏗️ The 3-Part Automated Pipeline

When you run `git push origin main`, three separate automated systems trigger in parallel to keep your production environment perfectly synced:

### 1. Frontend Code & UI (Coolify Auto-Deploy)
* **What it deploys:** React components, Pages, CSS, Vite config.
* **How it works:** You have the official GitHub App installed on your Coolify dashboard. When you push to `main`, GitHub sends a webhook ping to Coolify. Coolify pulls the repo, runs `npm run build`, and spins up the new static site container.
* **Trigger:** Any push to `main`.

### 2. Database Schema & Policies (GitHub Actions - Migrations)
* **What it deploys:** Tables, columns, RLS policies, PostgreSQL Triggers, and RPC functions.
* **How it works:** We use a GitHub Action (`.github/workflows/deploy-migrations.yml`). It uses the Supabase CLI to connect to your production database URL and runs `supabase db push`. This ensures that any structure changes you made locally are applied to production safely.
* **Trigger:** Pushes to `main` that contain changes to the `supabase/migrations/**` folder.

### 3. Edge Functions (GitHub Actions - SCP/SSH)
* **What it deploys:** Backend serverless logic (e.g., Riot OAuth, webhooks, email endpoints).
* **How it works:** We use a custom GitHub Action (`.github/workflows/deploy-functions.yml`). It connects directly to your Coolify server via SSH and copies the `supabase/functions` directory straight into your production server's persistent volume, applying the correct file permissions.
* **Trigger:** Pushes to `main` that contain changes to the `supabase/functions/**` folder.

---

## 🛠️ The Standard Developer Workflow

To ensure production never breaks, **never edit the Database directly in the Production UI.** Always follow this flow:

### Step 1: Develop Locally
Start your local Dockerized Supabase backend and Vite frontend:
```bash
supabase start
npm run dev
```

### Step 2: Make Database Changes (Using Migrations)
If you need to add a column, change an RLS policy, or create an RPC, do it on your **local** DB first. Then, tell Supabase to capture those changes into a migration file:

```bash
# Example: You added a "points" column to "profiles"
supabase db diff -f add_points_to_profiles
```
*This generates a new `.sql` file in `supabase/migrations/`.*

### Step 3: Test Edge Functions (Optional)
If you created a new Edge function, test it locally:
```bash
supabase functions serve my-new-function
```

### Step 4: Commit & Push to Production
Review your changes, commit them to git, and push:
```bash
git add .
git commit -m "feat: Added points system and updated Edge Functions"
git push origin main
```

### Step 5: The Magic Happens ✨
Once you push:
1. **Coolify** automatically starts building your new React frontend.
2. **GitHub Actions** sees your new `.sql` file and automatically pushes it to your Production Database.
3. **GitHub Actions** sees your new Edge Function and copies it onto your Server.

By the time the React frontend finishes building, the database schema and edge functions are already updated and waiting!

---

## 🔑 Required Secrets Configuration

For the automated GitHub Actions to work, you must configure these **Repository Secrets** in GitHub (`Settings` -> `Secrets and variables` -> `Actions`):

### Database Migrations (`deploy-migrations.yml`)
Because you are self-hosting Supabase on Coolify, you do not need Cloud API tokens. You only need the direct connection string.
* `PROD_DB_URL`: Your full PostgreSQL connection string. Format: `postgresql://postgres:[PASSWORD]@[COOLIFY_SERVER_IP]:5432/postgres`

### Edge Functions (`deploy-functions.yml`)
* `SERVER_IP`: The public IP address of your Coolify server.
* `SERVER_USER`: The SSH username (usually `root` or `ubuntu`).
* `SSH_PRIVATE_KEY`: A private SSH key that has access to your server.

> **Note on Changing Servers:** If you ever migrate Coolify to a new VPS, you **must** update the `SERVER_IP` generic secret on GitHub, AND update the Coolify Webhook via the Coolify Dashboard UI!
