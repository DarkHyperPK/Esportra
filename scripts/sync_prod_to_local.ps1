<#
.SYNOPSIS
    Syncs your production Supabase database + storage to local Docker.

.DESCRIPTION
    Opens an SSH tunnel to the Coolify server, dumps the production database
    (schema, data, auth users, storage metadata), restores it into your local
    Supabase instance, and downloads storage files so images work locally.

.EXAMPLE
    .\scripts\sync_prod_to_local.ps1
    .\scripts\sync_prod_to_local.ps1 -SkipStorage
    .\scripts\sync_prod_to_local.ps1 -DataOnly
#>

param(
    [switch]$SkipStorage,     # Skip downloading storage files (faster sync)
    [switch]$DataOnly,        # Only sync data, skip schema rebuild
    [switch]$Force            # Skip confirmation prompt
)

# ── Configuration ──────────────────────────────────────────────────────────────
$SSH_KEY = "$env:USERPROFILE\Downloads\esportra-dubai-ssh-key-2026-02-24.key"
$SERVER_IP = "84.235.246.82"
$SERVER_USER = "ubuntu"
$TUNNEL_PORT = 15432                     # local port for the SSH tunnel (avoid conflict with local supabase on 54322)
$PROD_DB_USER = "postgres"
$PROD_DB_PASS = "UcXRNmIJriixCwenlLG3dYJRMdFBEdk7"
$PROD_DB_NAME = "postgres"
$LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
$DUMP_DIR = "$PSScriptRoot\..\supabase\dumps"

# Storage path on the production server (Coolify docker volume)
$REMOTE_STORAGE = "/data/coolify/services/moooksg0ssk04cg8coksgowc/volumes/storage"
$LOCAL_STORAGE = "$PSScriptRoot\..\supabase\storage"

# ── Pre-flight checks ────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Esportra: Production -> Local DB Sync" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check SSH key exists
if (-not (Test-Path $SSH_KEY)) {
    Write-Host "ERROR: SSH key not found at: $SSH_KEY" -ForegroundColor Red
    Write-Host "Set the path or place your key at: $SSH_KEY" -ForegroundColor Yellow
    exit 1
}

# Check that local supabase is running
try {
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:54321/rest/v1/" -Method Head -ErrorAction Stop 2>$null
}
catch {
    Write-Host "ERROR: Local Supabase doesn't seem to be running on port 54321." -ForegroundColor Red
    Write-Host "Run 'supabase start' first, then try again." -ForegroundColor Yellow
    exit 1
}

# Check pg_dump and psql are available
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $pgDump -or -not $psql) {
    Write-Host "ERROR: pg_dump and/or psql not found in PATH." -ForegroundColor Red
    Write-Host "Install PostgreSQL client tools or add them to your PATH." -ForegroundColor Yellow
    Write-Host "Usually at: C:\Program Files\PostgreSQL\15\bin" -ForegroundColor Yellow
    exit 1
}

# Confirmation
if (-not $Force) {
    Write-Host "This will OVERWRITE your local database with production data." -ForegroundColor Yellow
    Write-Host "Local Supabase: $LOCAL_DB_URL" -ForegroundColor DarkGray
    Write-Host "Production via: SSH tunnel through $SERVER_IP" -ForegroundColor DarkGray
    Write-Host ""
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Aborted." -ForegroundColor Red
        exit 0
    }
}

# Create dump directory
New-Item -ItemType Directory -Path $DUMP_DIR -Force | Out-Null

# ── Step 1: Open SSH Tunnel ──────────────────────────────────────────────────
Write-Host ""
Write-Host "[1/6] Opening SSH tunnel to production..." -ForegroundColor Green

# Kill any existing tunnel on this port
$existing = Get-NetTCPConnection -LocalPort $TUNNEL_PORT -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  Closing existing tunnel on port $TUNNEL_PORT..." -ForegroundColor Yellow
    $existing | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}

# Start SSH tunnel in background
$sshArgs = @(
    "-i", $SSH_KEY,
    "-o", "StrictHostKeyChecking=no",
    "-o", "UserKnownHostsFile=/dev/null",
    "-N",                           # no remote command
    "-L", "${TUNNEL_PORT}:127.0.0.1:5432",   # forward local port to remote postgres
    "${SERVER_USER}@${SERVER_IP}"
)
$sshProcess = Start-Process -FilePath "ssh" -ArgumentList $sshArgs -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3

# Test tunnel
$env:PGPASSWORD = $PROD_DB_PASS
try {
    $test = & psql -h 127.0.0.1 -p $TUNNEL_PORT -U $PROD_DB_USER -d $PROD_DB_NAME -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Connection failed" }
    Write-Host "  Tunnel connected successfully." -ForegroundColor Green
}
catch {
    Write-Host "  ERROR: SSH tunnel failed. Check your SSH key and server IP." -ForegroundColor Red
    Stop-Process -Id $sshProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# ── Step 2: Dump Production Database ─────────────────────────────────────────
Write-Host "[2/6] Dumping production database..." -ForegroundColor Green

$env:PGPASSWORD = $PROD_DB_PASS

# Dump public schema (structure + data)
Write-Host "  Dumping public schema..."
& pg_dump -h 127.0.0.1 -p $TUNNEL_PORT -U $PROD_DB_USER -d $PROD_DB_NAME `
    --schema=public `
    --no-owner --no-privileges `
    --clean --if-exists `
    -f "$DUMP_DIR\public_schema.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: pg_dump failed for public schema." -ForegroundColor Red
    Stop-Process -Id $sshProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# Dump auth.users (data only -- local supabase already has the schema)
Write-Host "  Dumping auth users..."
& pg_dump -h 127.0.0.1 -p $TUNNEL_PORT -U $PROD_DB_USER -d $PROD_DB_NAME `
    --schema=auth `
    --data-only `
    --table=auth.users `
    --table=auth.identities `
    --table=auth.sessions `
    --no-owner --no-privileges `
    --column-inserts `
    -f "$DUMP_DIR\auth_data.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: auth dump had issues (non-fatal)." -ForegroundColor Yellow
}

# Dump storage metadata (buckets + objects records)
Write-Host "  Dumping storage metadata..."
& pg_dump -h 127.0.0.1 -p $TUNNEL_PORT -U $PROD_DB_USER -d $PROD_DB_NAME `
    --schema=storage `
    --data-only `
    --table=storage.buckets `
    --table=storage.objects `
    --no-owner --no-privileges `
    --column-inserts `
    -f "$DUMP_DIR\storage_data.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: storage dump had issues (non-fatal)." -ForegroundColor Yellow
}

$publicSize = (Get-Item "$DUMP_DIR\public_schema.sql").Length / 1KB
$authSize = if (Test-Path "$DUMP_DIR\auth_data.sql") { (Get-Item "$DUMP_DIR\auth_data.sql").Length / 1KB } else { 0 }
$storSize = if (Test-Path "$DUMP_DIR\storage_data.sql") { (Get-Item "$DUMP_DIR\storage_data.sql").Length / 1KB } else { 0 }
Write-Host "  Dumps complete: public=${publicSize}KB, auth=${authSize}KB, storage=${storSize}KB" -ForegroundColor Green

# ── Step 3: Reset Local Database ─────────────────────────────────────────────
Write-Host "[3/6] Resetting local database..." -ForegroundColor Green

# From here on, don't let psql stderr notices (harmless) crash the script
$ErrorActionPreference = "Continue"
$env:PGPASSWORD = "postgres"

# Drop and recreate public schema to get a clean slate
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DROP SCHEMA IF EXISTS public CASCADE;" 2>$null
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;" 2>$null

# Clear auth tables (order matters due to foreign keys)
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DELETE FROM auth.sessions;" 2>$null
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DELETE FROM auth.refresh_tokens;" 2>$null
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DELETE FROM auth.mfa_factors;" 2>$null
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DELETE FROM auth.identities;" 2>$null
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DELETE FROM auth.users;" 2>$null

# Clear storage tables
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DELETE FROM storage.objects;" 2>$null
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "DELETE FROM storage.buckets;" 2>$null

Write-Host "  Local database cleaned." -ForegroundColor Green

# ── Step 4: Restore Dumps ────────────────────────────────────────────────────
Write-Host "[4/6] Restoring production data into local..." -ForegroundColor Green

$env:PGPASSWORD = "postgres"

# Restore public schema
Write-Host "  Restoring public schema + data..."
& psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f "$DUMP_DIR\public_schema.sql" -v ON_ERROR_STOP=0 2>$null

# Restore auth data
if (Test-Path "$DUMP_DIR\auth_data.sql") {
    Write-Host "  Restoring auth users..."
    & psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f "$DUMP_DIR\auth_data.sql" -v ON_ERROR_STOP=0 2>$null
}

# Restore storage metadata
if (Test-Path "$DUMP_DIR\storage_data.sql") {
    Write-Host "  Restoring storage metadata..."
    & psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f "$DUMP_DIR\storage_data.sql" -v ON_ERROR_STOP=0 2>$null
}

Write-Host "  Database restored." -ForegroundColor Green

# ── Step 5: Download Storage Files ───────────────────────────────────────────
if (-not $SkipStorage) {
    Write-Host "[5/6] Downloading storage files from production..." -ForegroundColor Green

    $LOCAL_STORAGE_TEMP = "$PSScriptRoot\..\supabase\storage"
    New-Item -ItemType Directory -Path $LOCAL_STORAGE_TEMP -Force | Out-Null

    # 5a. Create a readable copy on the server (files need sudo to read)
    Write-Host "  Preparing files on server..."
    & ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_IP}" "sudo rm -rf /tmp/storage_export && sudo cp -r ${REMOTE_STORAGE}/ /tmp/storage_export && sudo chown -R ${SERVER_USER}:${SERVER_USER} /tmp/storage_export"

    # 5b. Download via SCP
    Write-Host "  Downloading files (this may take a few minutes for ~300MB)..."
    & scp -i $SSH_KEY -o StrictHostKeyChecking=no -r "${SERVER_USER}@${SERVER_IP}:/tmp/storage_export/" "$LOCAL_STORAGE_TEMP\"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: SCP download failed or was partial." -ForegroundColor Yellow
    }
    else {
        # 5c. Copy files into the Docker storage container volume
        Write-Host "  Injecting files into Docker storage container..."
        & docker cp "${LOCAL_STORAGE_TEMP}\storage_export\." supabase_storage_frag-and-book-main:/mnt/

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Storage files synced into container." -ForegroundColor Green
        }
        else {
            Write-Host "  WARNING: docker cp failed." -ForegroundColor Yellow
        }
    }

    # 5d. Cleanup server temp
    & ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_IP}" "sudo rm -rf /tmp/storage_export" 2>$null

    Write-Host "  Storage sync complete." -ForegroundColor Green
}
else {
    Write-Host "[5/6] Skipping storage download (--SkipStorage flag)." -ForegroundColor Yellow
}

# ── Step 6: Verify ──────────────────────────────────────────────────────────
Write-Host "[6/6] Verifying sync..." -ForegroundColor Green

$env:PGPASSWORD = "postgres"

# Count tables and rows locally
$verifyQuery = "SELECT 'tables', count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' UNION ALL SELECT 'auth_users', count(*) FROM auth.users UNION ALL SELECT 'storage_buckets', count(*) FROM storage.buckets UNION ALL SELECT 'storage_objects', count(*) FROM storage.objects;"
$localCounts = & psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -t -A -c $verifyQuery

Write-Host ""
Write-Host "  Local database summary:" -ForegroundColor Cyan
$localCounts -split "`n" | ForEach-Object {
    if ($_.Trim()) {
        $parts = $_.Split('|')
        if ($parts.Length -eq 2) {
            Write-Host "    $($parts[0].Trim()): $($parts[1].Trim())" -ForegroundColor White
        }
    }
}

# ── Cleanup ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Closing SSH tunnel..." -ForegroundColor DarkGray
Stop-Process -Id $sshProcess.Id -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Sync complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your local Supabase now mirrors production." -ForegroundColor White
Write-Host "  App:    http://localhost:5173" -ForegroundColor DarkGray
Write-Host "  Studio: http://localhost:54323" -ForegroundColor DarkGray
Write-Host "  DB:     postgresql://postgres:postgres@127.0.0.1:54322/postgres" -ForegroundColor DarkGray
Write-Host ""
Write-Host "This data persists across Docker restarts." -ForegroundColor Yellow
Write-Host "Run this script again anytime to refresh from production." -ForegroundColor Yellow
Write-Host ""
