# 🗄️ Database Backup for Free Tier (No Dashboard Backup Available)

Since free tier doesn't have backup/restore in dashboard, here are working alternatives:

## Method 1: Using pg_dump (Recommended - Works on Free Tier)

### Step 1: Get Connection Details

**Current Project:**
1. Go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Copy the connection string or note:
   - Host: `[project-ref].supabase.co`
   - Database: `postgres`
   - Port: `5432`
   - User: `postgres`
   - Password: (your database password)

**Backup Project:**
- Do the same for your backup project

### Step 2: Export Database (Current Project)

**Windows (PowerShell):**
```powershell
# Install PostgreSQL tools first (if not installed)
# Download from: https://www.postgresql.org/download/windows/

# Export schema + data
pg_dump -h [your-host].supabase.co `
  -U postgres `
  -d postgres `
  -F c `
  -f backup.dump

# Or export as SQL file
pg_dump -h [your-host].supabase.co `
  -U postgres `
  -d postgres `
  -f backup.sql
```

**Mac/Linux:**
```bash
# Export schema + data
pg_dump -h [your-host].supabase.co \
  -U postgres \
  -d postgres \
  -F c \
  -f backup.dump

# Or export as SQL file
pg_dump -h [your-host].supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

**When prompted, enter your database password**

### Step 3: Import to Backup Project

```bash
# Import from dump file
pg_restore -h [backup-host].supabase.co \
  -U postgres \
  -d postgres \
  -c \
  backup.dump

# Or import from SQL file
psql -h [backup-host].supabase.co \
  -U postgres \
  -d postgres \
  -f backup.sql
```

## Method 2: Using Supabase CLI (Free Tier Compatible)

### Install Supabase CLI

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Export Database

```bash
# Method A: Using connection string
supabase db dump \
  --db-url "postgresql://postgres:[password]@[host].supabase.co:5432/postgres" \
  -f backup.sql

# Method B: Link project (requires Supabase CLI login)
supabase login
supabase link --project-ref [your-project-ref]
supabase db dump -f backup.sql
```

### Import to Backup Project

```bash
# Using connection string
psql "postgresql://postgres:[password]@[backup-host].supabase.co:5432/postgres" \
  -f backup.sql

# Or using Supabase CLI
supabase db reset \
  --db-url "postgresql://postgres:[password]@[backup-host].supabase.co:5432/postgres"
```

## Method 3: Manual SQL Export/Import (No Tools Needed)

### Step 1: Export Schema (Current Project SQL Editor)

Run this in your **current project's SQL Editor**:

```sql
-- Get all table creation statements
SELECT 
  'CREATE TABLE IF NOT EXISTS ' || table_schema || '.' || table_name || ' (' ||
  string_agg(
    column_name || ' ' || 
    CASE 
      WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
      WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
      WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
      WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
      WHEN data_type = 'uuid' THEN 'UUID'
      WHEN data_type = 'jsonb' THEN 'JSONB'
      WHEN data_type = 'text' THEN 'TEXT'
      WHEN data_type = 'integer' THEN 'INTEGER'
      WHEN data_type = 'bigint' THEN 'BIGINT'
      WHEN data_type = 'boolean' THEN 'BOOLEAN'
      ELSE UPPER(data_type)
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE 
      WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
      ELSE ''
    END,
    ', ' ORDER BY ordinal_position
  ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name NOT LIKE 'pg_%'
GROUP BY table_schema, table_name
ORDER BY table_name;
```

**Copy all the CREATE TABLE statements**

### Step 2: Export Data (Current Project SQL Editor)

For each table, run:

```sql
-- Example: Export profiles table data
SELECT 'INSERT INTO profiles (id, username, full_name, ...) VALUES ' || 
  string_agg(
    '(' || 
    COALESCE('''' || id || '''', 'NULL') || ', ' ||
    COALESCE('''' || username || '''', 'NULL') || ', ' ||
    -- Add all columns here
    ')',
    ', '
  ) || ';'
FROM profiles;
```

**Or use COPY command (if available):**

```sql
-- Export as CSV (copy the results)
COPY (SELECT * FROM your_table) TO STDOUT WITH CSV HEADER;
```

### Step 3: Export RLS Policies (Current Project SQL Editor)

```sql
SELECT 
  'CREATE POLICY "' || policyname || '" ON ' || schemaname || '.' || tablename ||
  ' FOR ' || cmd || 
  CASE 
    WHEN qual IS NOT NULL THEN ' USING (' || qual || ')'
    ELSE ''
  END ||
  CASE 
    WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')'
    ELSE ''
  END || ';' as policy_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Step 4: Import to Backup Project

1. Go to **backup project's SQL Editor**
2. Run in this order:
   - CREATE TABLE statements
   - INSERT statements (data)
   - CREATE POLICY statements
   - CREATE INDEX statements (if any)

## Method 4: Using Online Tools (No Installation)

### Use Supabase SQL Editor + Copy/Paste

1. **Export from current project:**
   - Run queries to get CREATE TABLE statements
   - Copy results
   - Export data table by table

2. **Import to backup project:**
   - Paste and run in SQL Editor
   - Run statements one by one

## Method 5: Export Specific Tables Only

If you only need specific tables:

```sql
-- Export specific table structure + data
-- Run in current project SQL Editor, copy results

-- Structure
SELECT 
  'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
  string_agg(column_name || ' ' || data_type, ', ') || 
  ');'
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'tournaments', 'teams') -- Your tables
GROUP BY table_name;

-- Data (for each table)
SELECT * FROM profiles; -- Copy results
SELECT * FROM tournaments; -- Copy results
```

## Quick Start Guide (Easiest for Free Tier)

### Option A: pg_dump (If you have PostgreSQL installed)

```bash
# 1. Export
pg_dump -h [host].supabase.co -U postgres -d postgres -f backup.sql

# 2. Import
psql -h [backup-host].supabase.co -U postgres -d postgres -f backup.sql
```

### Option B: Manual SQL (No installation needed)

1. **Current project SQL Editor:**
   - Run schema export queries
   - Copy CREATE TABLE statements
   - Export data for each table

2. **Backup project SQL Editor:**
   - Paste and run CREATE TABLE statements
   - Paste and run INSERT statements
   - Paste and run CREATE POLICY statements

## Troubleshooting

### "pg_dump: command not found"
- **Windows**: Install PostgreSQL from https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql-client`

### "Permission denied" errors
- Make sure you're using the correct database password
- Check connection string is correct
- Verify project is not paused

### "Connection timeout"
- Check your IP is allowed in Supabase settings
- Try using connection pooling URL instead

## Recommended Approach for Free Tier

**Best option: pg_dump**

1. Install PostgreSQL client tools
2. Export: `pg_dump -h [host] -U postgres -d postgres -f backup.sql`
3. Import: `psql -h [backup-host] -U postgres -d postgres -f backup.sql`

**If you can't install tools: Manual SQL export/import via SQL Editor**

## What to Export

Priority order:
1. ✅ Table structures (CREATE TABLE)
2. ✅ Data (INSERT statements)
3. ✅ RLS policies (CREATE POLICY)
4. ✅ Indexes (CREATE INDEX)
5. ✅ Functions/Triggers (if any)

## Notes

- Free tier has connection limits - be patient with large exports
- Export in smaller chunks if database is large
- Test with one table first before full export
- Keep exported SQL files as backup

