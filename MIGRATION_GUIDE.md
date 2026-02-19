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
    *   **User**: `postgres.abbjywqlxnxoutllbgke`
    *   **Password**: `7ci32oggEcY2VRN0`
2.  Go to **Project Settings** -> **API**.
    *   **Project URL**: `https://abbjywqlxnxoutllbgke.supabase.co`
    *   **service_role secret**: (Click reveal) — You need this for the storage sync.

### From Coolify Supabase (New):
1.  In Coolify, create a new **Service** -> **Supabase**.
2.  Once deployed, go to the Service's **Environment Variables**.
3.  Find and note down:
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
USER="postgres.abbjywqlxnxoutllbgke"
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
export VITE_SUPABASE_URL="https://abbjywqlxnxoutllbgke.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="PASTE_YOUR_CLOUD_SERVICE_ROLE_KEY_HERE"

# 2. Install the Supabase library
npm install @supabase/supabase-js

# 3. Run the sync script
node scripts/migration/storage_sync.js
```

This will create a folder called `supabase_storage_backup/` containing all your files structured by bucket.

---

## 📥 Step 4: Import to Your New Instance

Now we push that data into your self-hosted Supabase.

### 4.1 Import the Database
In Coolify, find the internal IP address of your Supabase DB or use `localhost` if running commands directly on the host where Docker is.

```bash
# Run the import (Use your NEW Coolify POSTGRES_PASSWORD)
psql -h <NEW_DB_IP_OR_LOCALHOST> -U postgres -d postgres < esportra_full_dump.sql
```

### 4.2 Move Storage Files
The easiest way for self-hosted instances is to copy the files into the Docker volume. 
On your server, Supabase storage is usually stored in a Docker volume. 

Find where it is:
```bash
docker volume inspect supabase_storage | grep Mountpoint
```
Then copy your backed-up files into that path.

---

## 🚀 Step 5: Update Your App

Finally, tell your Esportra Web app to use the new server.

1.  In Coolify, go to your **Esportra-Web** application.
2.  Update the **Environment Variables**:
    *   `VITE_SUPABASE_URL`: Your new domain (e.g., `https://supabase.yourdomain.com`)
    *   `VITE_SUPABASE_ANON_KEY`: Your **NEW** Anon Key from Coolify.
3.  Click **Save** and **Redeploy**.

---

## ✅ Done!
Your app is now running on your own hardware, with all your data and images intact. 

**Wait! If you hit an error like "Relation already exists" or "Permission denied":**
Just type the error here and I will give you the specific fix!
