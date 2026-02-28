<#
.SYNOPSIS
    Syncs production Supabase (DB + Storage) to the Staging instance.

.DESCRIPTION
    1. Opens two SSH tunnels to the Coolify VPS:
       - Local 15432  -> VPS 5432  (Production DB)
       - Local 25432  -> VPS 5433  (Staging DB)
    2. Dumps prod: public schema + auth.users/identities + storage metadata.
    3. Cleans and restores those dumps into the staging DB.
    4. Uses MinIO mc mirror to sync the 'stub' bucket from prod MinIO to staging
       MinIO (proper native protocol, preserves MinIO XL format correctly).

.EXAMPLE
    .\scripts\sync_prod_to_staging.ps1
    .\scripts\sync_prod_to_staging.ps1 -SkipStorage
    .\scripts\sync_prod_to_staging.ps1 -Force
#>

param(
    [switch]$SkipStorage,   # Skip storage file copy (faster, DB-only sync)
    [switch]$Force          # Skip confirmation prompt
)

# ── Configuration ──────────────────────────────────────────────────────────────
$SSH_KEY        = "$env:USERPROFILE\Downloads\esportra-dubai-ssh-key-2026-02-24.key"
$SERVER_IP      = "84.235.246.82"
$SERVER_USER    = "ubuntu"

# SSH tunnel ports (local → remote)
$PROD_TUNNEL_PORT    = 15432   # -> VPS:5432 (production postgres)
$STAGING_TUNNEL_PORT = 25432   # -> VPS:5433 (staging postgres)

# DB credentials
$PROD_DB_PASS    = "UcXRNmIJriixCwenlLG3dYJRMdFBEdk7"
$STAGING_DB_PASS = "8ZZ58ljYGzkGXHmedxsFW1UtBX3L2y6C"
$DB_USER         = "postgres"
$DB_NAME         = "postgres"

# MinIO credentials (obtained from docker inspect on the VPS)
$PROD_MINIO_USER    = "zE8an7ShTST6xTvA"
$PROD_MINIO_PASS    = "2ZaY6zWjNFPuyI9ugd7xpvEzSpQECw1A"
$STAGING_MINIO_USER = "TJWcxEaIzKrN9XyO"
$STAGING_MINIO_PASS = "g4jzkqV7XRPZwfekX9IBh7Pj7ZxtMUiZ"
# MinIO Docker-internal IPs (prod: 10.0.3.12:9000, staging: 10.0.4.4:9000)
$PROD_MINIO_IP    = "10.0.3.12"
$STAGING_MINIO_IP = "10.0.4.4"

# Local dump directory
$DUMP_DIR = "$PSScriptRoot\..\supabase\dumps_staging"

$SSH_OPTS = @("-i", $SSH_KEY, "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null")

# ── Pre-flight checks ────────────────────────────────────────────────────────
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Esportra: Production -> Staging Sync" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $SSH_KEY)) {
    Write-Host "ERROR: SSH key not found at: $SSH_KEY" -ForegroundColor Red
    exit 1
}

foreach ($cmd in @("ssh", "pg_dump", "psql")) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' not found in PATH." -ForegroundColor Red
        if ($cmd -in @("pg_dump", "psql")) {
            Write-Host "  Add PostgreSQL bin to PATH, e.g.: C:\Program Files\PostgreSQL\15\bin" -ForegroundColor Yellow
        }
        exit 1
    }
}

if (-not $Force) {
    Write-Host "This will OVERWRITE the staging database with production data." -ForegroundColor Yellow
    Write-Host "  Production  : tunnel via VPS $SERVER_IP`:5432" -ForegroundColor DarkGray
    Write-Host "  Staging     : tunnel via VPS $SERVER_IP`:5433" -ForegroundColor DarkGray
    Write-Host ""
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Aborted." -ForegroundColor Red
        exit 0
    }
}

New-Item -ItemType Directory -Path $DUMP_DIR -Force | Out-Null

# ── Helper: kill any process owning a local TCP port ──────────────────────────
function Close-PortProcess([int]$Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conn) {
        $conn | ForEach-Object {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 1
    }
}

# ── Step 1: Open SSH Tunnels ──────────────────────────────────────────────────
Write-Host "[1/6] Opening SSH tunnels..." -ForegroundColor Green

Close-PortProcess $PROD_TUNNEL_PORT
Close-PortProcess $STAGING_TUNNEL_PORT

$prodTunnel = Start-Process -FilePath "ssh" -ArgumentList (
    $SSH_OPTS +
    @("-N", "-L", "${PROD_TUNNEL_PORT}:127.0.0.1:5432", "${SERVER_USER}@${SERVER_IP}")
) -PassThru -WindowStyle Hidden

$stagingTunnel = Start-Process -FilePath "ssh" -ArgumentList (
    $SSH_OPTS +
    @("-N", "-L", "${STAGING_TUNNEL_PORT}:127.0.0.1:5433", "${SERVER_USER}@${SERVER_IP}")
) -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 4

# Test production tunnel
$env:PGPASSWORD = $PROD_DB_PASS
$test = & psql -h 127.0.0.1 -p $PROD_TUNNEL_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Production tunnel failed. Output: $test" -ForegroundColor Red
    Stop-Process -Id $prodTunnel.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $stagingTunnel.Id -Force -ErrorAction SilentlyContinue
    exit 1
}
Write-Host "  Production tunnel OK (local:$PROD_TUNNEL_PORT -> VPS:5432)" -ForegroundColor Green

# Test staging tunnel
$env:PGPASSWORD = $STAGING_DB_PASS
$test = & psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Staging tunnel failed. Output: $test" -ForegroundColor Red
    Stop-Process -Id $prodTunnel.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $stagingTunnel.Id -Force -ErrorAction SilentlyContinue
    exit 1
}
Write-Host "  Staging tunnel OK  (local:$STAGING_TUNNEL_PORT -> VPS:5433)" -ForegroundColor Green

# ── Step 2: Dump Production Database ─────────────────────────────────────────
Write-Host "[2/6] Dumping production database..." -ForegroundColor Green
$env:PGPASSWORD = $PROD_DB_PASS

Write-Host "  Dumping public schema (structure + data)..."
& pg_dump -h 127.0.0.1 -p $PROD_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    --schema=public `
    --no-owner --no-privileges `
    --clean --if-exists `
    -f "$DUMP_DIR\public_schema.sql"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump failed for public schema." -ForegroundColor Red
    Stop-Process -Id $prodTunnel.Id, $stagingTunnel.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  Dumping auth.users and auth.identities (skip sessions to avoid JWT conflicts)..."
& pg_dump -h 127.0.0.1 -p $PROD_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    --schema=auth --data-only `
    --table=auth.users `
    --table=auth.identities `
    --no-owner --no-privileges `
    --column-inserts `
    -f "$DUMP_DIR\auth_data.sql"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: auth dump had issues (non-fatal, continuing)." -ForegroundColor Yellow
}

$sizes = @{
    public = if (Test-Path "$DUMP_DIR\public_schema.sql") { [math]::Round((Get-Item "$DUMP_DIR\public_schema.sql").Length / 1KB, 1) } else { 0 }
    auth   = if (Test-Path "$DUMP_DIR\auth_data.sql")     { [math]::Round((Get-Item "$DUMP_DIR\auth_data.sql").Length / 1KB, 1) }     else { 0 }
}
Write-Host "  Dumps: public=$($sizes.public)KB  auth=$($sizes.auth)KB  (storage copied live via tunnel)" -ForegroundColor Green

# ── Step 3: Clean Staging Database ───────────────────────────────────────────
Write-Host "[3/6] Cleaning staging database..." -ForegroundColor Green
$ErrorActionPreference = "Continue"
$env:PGPASSWORD = $STAGING_DB_PASS

# Drop and recreate public schema for a clean slate
& psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    -c "DROP SCHEMA IF EXISTS public CASCADE;" 2>$null
& psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    -c "CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;" 2>$null

# Clear auth tables (foreign key order)
foreach ($tbl in @("auth.sessions", "auth.refresh_tokens", "auth.mfa_factors", "auth.identities", "auth.users")) {
    & psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
        -c "TRUNCATE TABLE $tbl CASCADE;" 2>$null
}

# Clear storage tables
& psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    -c "TRUNCATE TABLE storage.objects CASCADE;" 2>$null
& psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    -c "TRUNCATE TABLE storage.buckets CASCADE;" 2>$null

Write-Host "  Staging database cleaned." -ForegroundColor Green

# ── Step 4: Restore Dumps into Staging ───────────────────────────────────────
Write-Host "[4/6] Restoring production data into staging..." -ForegroundColor Green
$env:PGPASSWORD = $STAGING_DB_PASS

Write-Host "  Restoring public schema + data..."
& psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    -f "$DUMP_DIR\public_schema.sql" `
    -v ON_ERROR_STOP=0 2>$null

if (Test-Path "$DUMP_DIR\auth_data.sql") {
    Write-Host "  Restoring auth.users and auth.identities..."
    & psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
        -f "$DUMP_DIR\auth_data.sql" `
        -v ON_ERROR_STOP=0 2>$null
}

# Restore storage metadata via direct COPY between tunnels.
# NOTE: staging storage.buckets lacks the 'type' column (older schema) and
# storage.objects has 'path_tokens' as a GENERATED column — exclude both.
Write-Host "  Restoring storage.buckets (column-safe direct copy)..."
$bucketCols = "id,name,owner,created_at,updated_at,public,avif_autodetection,file_size_limit,allowed_mime_types,owner_id"
$env:PGPASSWORD = $PROD_DB_PASS
$bucketsCsv = & psql -h 127.0.0.1 -p $PROD_TUNNEL_PORT -U $DB_USER -d $DB_NAME -t -A `
    -c "COPY (SELECT $bucketCols FROM storage.buckets) TO STDOUT WITH CSV"
$env:PGPASSWORD = $STAGING_DB_PASS
$bucketsCsv | & psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    -c "COPY storage.buckets ($bucketCols) FROM STDIN WITH CSV" 2>$null

Write-Host "  Restoring storage.objects (excluding generated path_tokens)..."
$objectCols = "id,bucket_id,name,owner,created_at,updated_at,last_accessed_at,metadata,version,owner_id,user_metadata"
$env:PGPASSWORD = $PROD_DB_PASS
$objectsCsv = & psql -h 127.0.0.1 -p $PROD_TUNNEL_PORT -U $DB_USER -d $DB_NAME -t -A `
    -c "COPY (SELECT $objectCols FROM storage.objects) TO STDOUT WITH CSV"
$env:PGPASSWORD = $STAGING_DB_PASS
$objectsCsv | & psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME `
    -c "COPY storage.objects ($objectCols) FROM STDIN WITH CSV" 2>$null

Write-Host "  Database restored." -ForegroundColor Green

# Re-apply schema grants after restore.
# pg_dump uses --no-privileges so grants are stripped from the dump.
# The schema recreation in Step 3 may also be wiped by --clean restores.
# This matches production's nspacl grants.
Write-Host "  Re-applying schema and table grants for Supabase roles..."
$env:PGPASSWORD = $STAGING_DB_PASS
& psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME -c @"
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
"@ 2>$null
Write-Host "  Schema grants applied." -ForegroundColor Green

# ── Step 5: Storage Sync via MinIO mc mirror ─────────────────────────────────
if (-not $SkipStorage) {
    Write-Host "[5/6] Syncing storage via MinIO mc mirror (prod stub -> staging stub)..." -ForegroundColor Green

    # Ensure mc is available on the server
    Write-Host "  Ensuring mc client is present..."
    & ssh @SSH_OPTS "${SERVER_USER}@${SERVER_IP}" "test -f /tmp/mc || (wget -q https://dl.min.io/client/mc/release/linux-arm64/mc -O /tmp/mc && chmod +x /tmp/mc) && echo 'mc ready'"

    # Configure mc aliases
    Write-Host "  Configuring mc aliases..."
    & ssh @SSH_OPTS "${SERVER_USER}@${SERVER_IP}" "/tmp/mc alias set prod http://${PROD_MINIO_IP}:9000 $PROD_MINIO_USER $PROD_MINIO_PASS --api s3v4 2>&1"
    & ssh @SSH_OPTS "${SERVER_USER}@${SERVER_IP}" "/tmp/mc alias set staging http://${STAGING_MINIO_IP}:9000 $STAGING_MINIO_USER $STAGING_MINIO_PASS --api s3v4 2>&1"

    # Ensure stub bucket exists in staging
    Write-Host "  Ensuring stub bucket exists in staging MinIO..."
    & ssh @SSH_OPTS "${SERVER_USER}@${SERVER_IP}" "/tmp/mc mb staging/stub --ignore-existing 2>&1"

    # Mirror prod stub to staging stub
    Write-Host "  Mirroring prod stub -> staging stub (168MB, ~1-5 seconds on same VPS)..."
    & ssh @SSH_OPTS "${SERVER_USER}@${SERVER_IP}" "/tmp/mc mirror --preserve --overwrite prod/stub/ staging/stub/ 2>&1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  WARNING: mc mirror had issues. Check output above." -ForegroundColor Yellow
    }
    else {
        Write-Host "  Storage synced via MinIO." -ForegroundColor Green
    }

    # Show object count
    & ssh @SSH_OPTS "${SERVER_USER}@${SERVER_IP}" "/tmp/mc du staging/stub/ 2>&1"
}
else {
    Write-Host "[5/6] Skipping storage sync (-SkipStorage flag)." -ForegroundColor Yellow
}

# ── Step 6: Verify ──────────────────────────────────────────────────────────
Write-Host "[6/6] Verifying staging sync..." -ForegroundColor Green
$env:PGPASSWORD = $STAGING_DB_PASS

$verifyQuery = @"
SELECT label, cnt FROM (
  SELECT 'public_tables'    AS label, count(*)::text AS cnt FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
  UNION ALL
  SELECT 'auth_users',      count(*)::text FROM auth.users
  UNION ALL
  SELECT 'storage_buckets', count(*)::text FROM storage.buckets
  UNION ALL
  SELECT 'storage_objects', count(*)::text FROM storage.objects
) x ORDER BY label;
"@

$result = & psql -h 127.0.0.1 -p $STAGING_TUNNEL_PORT -U $DB_USER -d $DB_NAME -t -A -c $verifyQuery
Write-Host ""
Write-Host "  Staging database summary:" -ForegroundColor Cyan
$result -split "`n" | ForEach-Object {
    if ($_.Trim()) {
        $parts = $_.Split('|')
        if ($parts.Length -eq 2) {
            Write-Host ("    {0,-20} {1}" -f $parts[0].Trim(), $parts[1].Trim()) -ForegroundColor White
        }
    }
}

# ── Cleanup ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Closing SSH tunnels..." -ForegroundColor DarkGray
Stop-Process -Id $prodTunnel.Id, $stagingTunnel.Id -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Sync complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Staging now mirrors production." -ForegroundColor White
Write-Host "  Staging URL:    http://supabasekong-usoocgow4s0wow00gsw04kcg.84.235.246.82.sslip.io" -ForegroundColor DarkGray
Write-Host "  Staging Studio: http://supabasekong-usoocgow4s0wow00gsw04kcg.84.235.246.82.sslip.io" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Next: verify login + images work on the staging frontend." -ForegroundColor Yellow
Write-Host ""
