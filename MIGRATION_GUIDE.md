# Esportra Supabase Migration Guide

This guide describes how to move your data from Supabase Cloud to your self-hosted instance.

## 1. Export Database
Run this command from your local machine to export the entire Supabase Cloud database.

```bash
# Variables
HOST="db.abbjywqlxnxoutllbgke.supabase.co"
USER="postgres"
DB="postgres"

# Execute Dump
pg_dump --clean --if-exists --quote-all-identifiers \
  -h $HOST -U $USER -d $DB > esportra_full_dump.sql
```
*Note: You will be prompted for your Supabase Database Password.*

## 2. Sync Storage
Use the provided Node.js script to download all 18 buckets.

```bash
# Set environment variables
export VITE_SUPABASE_URL="https://abbjywqlxnxoutllbgke.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-cloud-service-role-key"

# Run sync
node scripts/migration/storage_sync.js
```
This will create a `supabase_storage_backup/` directory with all your files structured by bucket.

## 3. Import to Self-Hosted (Coolify)
1. In Coolify, find your Supabase Service.
2. Note the internal or public IP and the `POSTGRES_PASSWORD`.
3. Import the SQL:
   ```bash
   psql -h <vps-ip> -U postgres -d postgres < esportra_full_dump.sql
   ```
4. Upload Storage:
   - If using local storage in Supabase self-hosted, copy the contents of `supabase_storage_backup/` to the volumes mounted in your Docker container (usually under `/var/lib/docker/volumes/.../_data/storage`).
   - Alternatively, you can write a short "upload" script using the same logic as the sync script but pointed at your new URL.

## 4. Update Web App
In your **Esportra Web** app settings in Coolify:
- Update `VITE_SUPABASE_URL` to your new self-hosted URL.
- Update `VITE_SUPABASE_ANON_KEY` to your new self-hosted key.
- **Redeploy**.

---
**Need help with specific errors during the import? Just ask!**
