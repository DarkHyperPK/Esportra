# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login
3. Click "New Project"
4. Fill in:
   - **Name**: `frag-and-book`
   - **Database Password**: Create strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project"

## Step 2: Get Credentials

1. Go to **Settings → API** in your Supabase dashboard
2. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

## Step 3: Update Environment Variables

Create a `.env` file in your project root with:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Configuration
VITE_API_URL=http://localhost:5000/api

# App Configuration
VITE_APP_NAME=Frag and Book
VITE_APP_VERSION=1.0.0
```

## Step 4: Run Database Migration

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase_migration_fixed.sql`
3. Paste and run it in the SQL Editor

## Step 5: Test Connection

1. Restart your development server: `npm run dev`
2. Check browser console for any errors
3. Try signing up/logging in

## Troubleshooting

- **ERR_NAME_NOT_RESOLVED**: Check your Supabase URL is correct
- **Invalid API key**: Check your anon key is correct
- **Database errors**: Make sure migration ran successfully
