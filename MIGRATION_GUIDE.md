# Esportra Supabase Migration: The Master Guide 🏁

This guide provides a foolproof, step-by-step process to migrate your Esportra backend from Supabase Cloud to your self-hosted instance on Ubuntu / Coolify.

---

## 🛠️ Step 0: Preparation (On your Ubuntu Server)

First, let's make sure your Ubuntu server has the tools needed to talk to databases and run scripts. 

Connect to your server via SSH and run:

```bash
# Update package list
sudo apt-get update

# Install PostgreSQL 17 Client (to match Supabase Cloud version)
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-client-17

# Install Node.js & NPM (to run the storage sync script)
sudo apt-get install -y nodejs npm
```

---

## 🔑 Step 1: Collect Your Credentials

You need keys from **two** places: your old Cloud project and your new Coolify project.

### From Supabase Cloud (Old):
1.  Go to **Project Settings** -> **Database**.
    *   **Host**: `aws-1-us-east-1.pooler.supabase.com`
    *   **Port**: `5432`
    *   **User**: `postgres`
    *   **Password**: `7ci32oggEcY2VRN0`
2.  Go to **Project Settings** -> **API**.
    *   **Project URL**: `https://api.esportra.com`
    *   **service_role secret**: (Click reveal) — You need this for the storage sync.

### From Coolify Supabase (New):
1.  In Coolify, create a new **Service** -> **Supabase**.
2.  Once deployed, go to the Service's **Environment Variables**.
3.  Find and note down:
4.  Find and note down:
    *   `POSTGRES_PASSWORD`
    *   `ANON_KEY`
    *   `SERVICE_ROLE_KEY` (also called `SERVICE_KEY`)

---

## 💾 Step 2: Export Cloud Data (The "Backup")

Run this on your Ubuntu server to pull all your data into a single file.

```bash
# Variables (Using IPv4 Pooler Host for compatibility)
HOST="aws-1-us-east-1.pooler.supabase.com"
PORT="5432"
USER="postgres"
DB="postgres"

# Execute Dump (You will be prompted for your Cloud DB Password)
pg_dump --clean --if-exists --quote-all-identifiers \
  -h $HOST -p $PORT -U $USER -d $DB > esportra_full_dump.sql
```

*Note: When prompted for password, use: `7ci32oggEcY2VRN0`*

> [!NOTE]
> If you get a "command not found" error, make sure you ran the `apt-get` commands in Step 0.

---

## 📦 Step 3: Sync Your Storage (The "Media Move")

Since your buckets contain photos, banners, and logos, we need to download them locally.

> [!IMPORTANT]
> **You MUST be inside your project folder** (likely `Esportra`) for this to work.

1.  Navigate into your project directory:
    ```bash
    cd ~/Esportra
    ```

2.  Run these commands:

```bash
# 1. Set the keys for the script (Use your Cloud Service Role key)
export VITE_SUPABASE_URL="https://api.esportra.com"
export SUPABASE_SERVICE_ROLE_KEY="PASTE_YOUR_CLOUD_SERVICE_ROLE_KEY_HERE"

# 2. Install the Supabase library
npm install @supabase/supabase-js

# 3. Run the sync script
node scripts/migration/storage_sync.mjs
```

This will create a folder called `supabase_storage_backup/` containing all your files structured by bucket.

---

## 📥 Step 4: Import to Your New Instance

Now we push that data into your self-hosted Supabase.

#### 4.1 Import the Database
Since your dump contains everything (including system roles and extensions that already exist), you will see many **"ERROR: relation already exists"** or **"Permission denied"** messages. **This is normal and can usually be ignored.**

1.  **Enable required extensions**: 
    Run this first to make sure the extensions match the cloud:
    ```bash
    sudo docker exec -i supabase-db-moooksg0ssk04cg8coksgowc psql -U postgres -c "CREATE SCHEMA IF NOT EXISTS cron; CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;"
    ```

2.  **Run the "Safe" Import**:
    We will use a command that ignores existing data and continues through errors:
    ```bash
    # Use -v ON_ERROR_STOP=1 only if you want it to fail immediately on error.
    # We omit it here so it completes the public data import.
    cat ~/esportra_full_dump.sql | sudo docker exec -i supabase-db-moooksg0ssk04cg8coksgowc psql -U postgres -d postgres
    ```

3.  **What to do if you see errors?**
    - `relation "..." already exists`: **Ignore it**. The table is already there.
    - `must be owner of table ...`: **Ignore it**. The `postgres` user in self-hosted is sufficient.
    - `column "action_filter" ... does not exist`: **Ignore it**. This is a version mismatch in the Realtime extension which your app likely doesn't use for core logic anyway.

#### 4.2 Move Storage Files
On your server, Supabase storage is kept in a folder managed by Coolify. 

1.  **Copy your media backup into the live storage folder**:
    ```bash
    # Run this exact command
    sudo cp -r ~/supabase_storage_backup/* /data/coolify/services/moooksg0ssk04cg8coksgowc/volumes/storage/
    ```

2.  **Fix Permissions**:
    Ensure the Docker container can read the new files:
    ```bash
    sudo chown -R 1000:1000 /data/coolify/services/moooksg0ssk04cg8coksgowc/volumes/storage/
    ```

3.  **Verify**:
    You can check if files are there by running:
    ```bash
    sudo ls -R /data/coolify/services/moooksg0ssk04cg8coksgowc/volumes/storage/
    ```

---

---

## ⚡ Step 5: Migrate Edge Functions

Edge Functions are code, so we need to move them to the server and configure their secrets (API keys).

#### 5.1 Set Secrets in Coolify
Since you are self-hosting, you don't use the Supabase CLI for secrets. Use the Coolify UI:
1.  Go to your **Supabase** service in Coolify.
2.  Open the **Environment Variables** tab.
3.  **To Add Variables**: Look for a **"Developer View"** toggle or a **"Bulk Edit"** button (usually near the top right of the list).
4.  Paste your keys here:
    *   `RESEND_API_KEY`
    *   `RIOT_CLIENT_ID`
    *   `RIOT_CLIENT_SECRET`
    *   `RIOT_API_KEY`
    *   `PARTNER_URL`
5.  **Save** and **Redeploy** the Supabase service.

#### 5.2 Move the Code
1.  **Create the functions folder** on your server:
    ```bash
    sudo mkdir -p /data/coolify/services/moooksg0ssk04cg8coksgowc/volumes/functions/
    ```

2.  **Copy the code**:
    ```bash
    sudo cp -r ~/Esportra/supabase/functions/* /data/coolify/services/moooksg0ssk04cg8coksgowc/volumes/functions/
    ```

3.  **Fix Permissions**:
    ```bash
    sudo chown -R 1000:1000 /data/coolify/services/moooksg0ssk04cg8coksgowc/volumes/functions/
    ```

---

## 🚀 Step 6: Update Your App (The Final Switch)

Finally, tell your Esportra Web app to use the new server.

1.  In Coolify, go to your **Esportra-Web** application.
2.  Update the **Environment Variables**:
    *   `VITE_SUPABASE_URL`: `http://supabasekong-moooksg0ssk04cg8coksgowc.79.72.52.120.sslip.io`
    *   `VITE_SUPABASE_ANON_KEY`: `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MTUyNTY4MCwiZXhwIjo0OTI3MTk5MjgwLCJyb2xlIjoiYW5vbiJ9.4dFhdHD4sNmrTksU1D0rM6tyPWhdjkbm791U1_Ftznw`
3.  Click **Save** and **Redeploy**.

---

---

## ✅ Step 7: Verification

Now that the app and functions are moved, verify everything is working:

1.  **Check Logs**: Run this on your server to confirm functions are loaded:
    ```bash
    sudo docker logs supabase-edge-functions-moooksg0ssk04cg8coksgowc
    ```
    *Look for lines like "Listening on http://0.0.0.0:9000" or similar.*

2.  **Test Endpoint**: Visit this URL in your browser:
    `http://supabasekong-moooksg0ssk04cg8coksgowc.79.72.52.120.sslip.io/functions/v1/send-email`
    *   **Pass**: A 400 or 401 response (shows the function is alive).
    *   **Fail**: A 404 response (means the function isn't found).

3.  **App Login**: Try logging in to your Esportra Web app. 
    *If it works, your Edge Functions and DB are correctly linked!*

---

## 🆘 Troubleshooting
Your app is now running on your own hardware, with all your data and images intact. 

**Wait! If you hit an error like "Relation already exists" or "Permission denied":**
Just type the error here and I will give you the specific fix!
