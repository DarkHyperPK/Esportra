# 🗄️ Supabase Database Backup & Restore Guide

## Method 1: Using Supabase Dashboard (Easiest)

### Export Database

1. **Go to your current Supabase project**
   - Open Supabase Dashboard
   - Select your project

2. **Export the database**
   - Go to **Settings** → **Database**
   - Scroll to **Connection string** section
   - Click **"Download backup"** or use **SQL Editor**
   - Or go to **Database** → **Backups** → **Download backup**

3. **Alternative: Use SQL Editor**
   - Go to **SQL Editor**
   - Run this to get schema:
   ```sql
   -- Export schema
   pg_dump -h [host] -U postgres -d postgres -s > schema.sql
   ```
   - Or use Supabase's built-in backup feature

### Import to Backup Project

1. **Go to your backup Supabase project**
   - Open Supabase Dashboard
   - Select your backup project

2. **Import the database**
   - Go to **SQL Editor**
   - Paste and run your exported SQL
   - Or use **Database** → **Restore from backup**

## Method 2: Using pg_dump (Command Line)

### Export from Current Project

```bash
# Get connection details from Supabase Dashboard
# Settings → Database → Connection string

# Export schema only
pg_dump -h [your-host].supabase.co \
  -U postgres \
  -d postgres \
  -s \
  -f schema_backup.sql

# Export schema + data
pg_dump -h [your-host].supabase.co \
  -U postgres \
  -d postgres \
  -f full_backup.sql

# Export specific tables only
pg_dump -h [your-host].supabase.co \
  -U postgres \
  -d postgres \
  -t table_name \
  -f table_backup.sql
```

### Import to Backup Project

```bash
# Import to backup project
psql -h [backup-host].supabase.co \
  -U postgres \
  -d postgres \
  -f schema_backup.sql
```

## Method 3: Using Supabase CLI (Recommended)

### Install Supabase CLI

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Export Database

```bash
# Link to your current project
supabase link --project-ref [your-project-ref]

# Export database
supabase db dump -f backup.sql

# Or export specific schema
supabase db dump --schema public -f public_schema.sql
```

### Import to Backup Project

```bash
# Link to backup project
supabase link --project-ref [backup-project-ref]

# Import database
supabase db reset --db-url postgresql://postgres:[password]@[backup-host]:5432/postgres
# Then
psql -h [backup-host] -U postgres -d postgres -f backup.sql
```

## Method 4: Direct SQL Export/Import

### Step 1: Export Schema (Current Project)

Go to **SQL Editor** in your current project and run:

```sql
-- Export all table schemas
SELECT 
  'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || 
  string_agg(column_name || ' ' || data_type, ', ') || 
  ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY schemaname, tablename;

-- Export all data (for each table)
-- Example for one table:
COPY (SELECT * FROM your_table) TO STDOUT WITH CSV HEADER;
```

### Step 2: Export Data

For each important table, run in SQL Editor:

```sql
-- Get table data as INSERT statements
SELECT 'INSERT INTO ' || table_name || ' VALUES (' || 
  string_agg(column_name, ', ') || ');'
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'your_table';
```

### Step 3: Import to Backup Project

1. Go to **SQL Editor** in backup project
2. Run the CREATE TABLE statements first
3. Then run the INSERT statements

## Method 5: Supabase Dashboard Backup Feature

### Automated Backups

1. **Current Project**:
   - Go to **Settings** → **Database**
   - Enable **Point-in-time Recovery** (if available)
   - Go to **Database** → **Backups**
   - Download latest backup

2. **Backup Project**:
   - Go to **Database** → **Backups**
   - Click **"Restore from backup"**
   - Upload the backup file

## Quick Export Script (SQL)

Run this in your current project's SQL Editor to export everything:

```sql
-- Export all table structures
SELECT 
  'CREATE TABLE IF NOT EXISTS ' || table_schema || '.' || table_name || ' (' ||
  string_agg(
    column_name || ' ' || 
    CASE 
      WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
      WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
      ELSE UPPER(data_type)
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
    ', '
  ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_schema, table_name
ORDER BY table_name;
```

## Recommended Approach

**For a complete backup:**

1. **Use Supabase Dashboard**:
   - Current project → Settings → Database → Download backup
   - Backup project → Database → Restore from backup

2. **Or use Supabase CLI**:
   ```bash
   # Export
   supabase db dump -f backup.sql
   
   # Import
   psql -h [backup-host] -U postgres -d postgres -f backup.sql
   ```

## Important Notes

⚠️ **Before importing:**
- Make sure backup project is empty or you're okay overwriting
- Check that RLS policies are included in export
- Verify all extensions are enabled in backup project
- Test with a small table first

⚠️ **What gets exported:**
- ✅ Table structures
- ✅ Data
- ✅ Indexes
- ✅ Constraints
- ✅ RLS policies (if included)
- ❌ Storage files (need separate migration)
- ❌ Auth users (need separate export)

## Export Auth Users (Separate)

Auth users are in a separate schema. To export:

```sql
-- Export auth.users (run in current project)
SELECT * FROM auth.users;
```

Then import to backup project's auth schema.

## Complete Backup Checklist

- [ ] Export database schema
- [ ] Export database data
- [ ] Export RLS policies
- [ ] Export auth users (if needed)
- [ ] Export storage bucket metadata
- [ ] Note any custom functions/triggers
- [ ] Test import on backup project
- [ ] Verify all tables and data
- [ ] Test application with backup database

