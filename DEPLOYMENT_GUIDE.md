# Deployment Guide

This guide explains how to deploy your website while continuing development.

## Option 1: Deploy to Hostinger (Your Current Hosting) 🚀

Since you have Hostinger hosting and domain, this is the most direct option.

### Step 1: Build Your Frontend Locally

```bash
# Install dependencies (if not done)
npm install

# Build for production
npm run build
```

This creates a `dist` folder with all your static files.

### Step 2: Upload to Hostinger

**Via File Manager (Easy):**
1. Login to Hostinger **hPanel**
2. Go to **File Manager**
3. Navigate to `public_html` (or your domain folder)
4. Delete any existing files (or backup first)
5. Upload **entire contents** of the `dist` folder
   - Select all files in `dist/` folder
   - Upload them to `public_html/`

**Via FTP (Faster for updates):**
1. Get FTP credentials from Hostinger hPanel → FTP Accounts
2. Use FileZilla or any FTP client
3. Connect to your Hostinger server
4. Navigate to `public_html` folder
5. Upload contents of `dist/` folder

### Step 3: Configure Your Domain

Your domain should already be pointing to Hostinger. If not:
1. In hPanel → Domains → DNS Zone Editor
2. Make sure A record points to Hostinger IP

### Step 4: Environment Variables

Since this is a static site, you need to configure environment variables before building:

Create a `.env.production` file in your project root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then build again:
```bash
npm run build
```

**Important:** The `.env.production` values get baked into the build, so rebuild after changing them.

### Step 5: Test Your Site

Visit your domain: `https://yourdomain.com`

### Continuous Updates Workflow:

```bash
# 1. Make changes locally
# 2. Test with: npm run dev

# 3. Build for production
npm run build

# 4. Upload dist/ folder to Hostinger
#    - Via File Manager or FTP
#    - Replace old files in public_html/

# 5. Your site updates immediately!
```

**Tip:** Use FTP for faster updates - just replace changed files.

---

## Option 2: Deploy to Vercel (Recommended for Easy Auto-Deploy)

### 1. Push Code to GitHub
```bash
git init  # if not already initialized
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/your-repo.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Vercel auto-detects settings from `vercel.json`
6. Add environment variables (see below)
7. Click **"Deploy"**

### 3. Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=https://your-backend-url.railway.app/api  # if using backend
```

**Important**: Get these from:
- Supabase Dashboard → Settings → API
- Copy the URL and anon key

## Continuous Deployment

### How It Works:
1. **Work locally** → Make changes on your machine
2. **Test locally** → Run `npm run dev` to test
3. **Push to GitHub** → `git push origin main`
4. **Vercel auto-deploys** → Updates live site in ~1 minute

### Deployment Branches:
- **`main` branch** → Production site (your live demo URL)
- **Other branches** → Preview deployments (for testing)

## Database Migrations (Supabase)

### Apply Migrations via Supabase Dashboard:
1. Go to Supabase Dashboard → SQL Editor
2. Copy migration file content from `supabase/migrations/`
3. Paste and run in SQL Editor

### Or via Supabase CLI:
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Backend Deployment (Only if needed)

**Note:** Since you're using Supabase, you likely don't need the Express backend deployed separately. Supabase handles:
- Authentication
- Database
- API endpoints via Supabase RPC functions

### If you DO need the backend:

**Option A: Hostinger VPS** (if you have VPS hosting)
1. SSH into your VPS
2. Install Node.js
3. Clone your repository
4. Install dependencies: `npm install`
5. Use PM2 to keep it running: `pm2 start server.js`

**Option B: Free Hosting (Railway/Render)**
- Railway: Connect GitHub, deploy automatically
- Render: Free tier, easy deployment
- Only needed if you have specific backend features outside Supabase

## Environment Setup

### Hostinger Production Environment:
- Frontend: `https://yourdomain.com` (your Hostinger domain)
- Database: Supabase (same as development)
- Backend: Not needed (using Supabase)

### Vercel Production Environment:
- Frontend: `https://your-app.vercel.app`
- Database: Supabase (same as development)

### Development Environment:
- Frontend: `http://localhost:5173` (Vite default)
- Database: Supabase (can use same or separate project)

## Best Practices

1. **Never commit secrets**: Use environment variables
2. **Test locally first**: Always test with `npm run dev` before pushing
3. **Use branches**: Create feature branches, test, then merge to main
4. **Database migrations**: Always test migrations in a dev Supabase project first
5. **Monitor deployments**: Check Vercel dashboard for deployment status

## Troubleshooting

### Build Fails:
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### Database Issues:
- Check Supabase connection string
- Verify RLS policies allow public access (if needed)
- Check migration order

### CORS Issues:
- Add your Vercel URL to Supabase allowed origins
- Check backend CORS settings if using separate backend

## Hostinger Specific Tips

### Creating .htaccess for React Router (IMPORTANT)

Since you're using React Router, create an `.htaccess` file in `public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

This ensures React Router works correctly on refresh.

### Enable HTTPS (SSL)

1. In Hostinger hPanel → SSL
2. Install free Let's Encrypt SSL
3. Force HTTPS redirect

### Performance Tips

1. **Enable Gzip Compression** - Already handled by Hostinger
2. **CDN** - Consider Hostinger CDN if available
3. **Caching** - Add cache headers in `.htaccess` if needed

### Quick Update Script

Create a simple script to automate uploads:

**update-hostinger.sh** (Mac/Linux):
```bash
#!/bin/bash
npm run build
cd dist
# Use rsync or scp to upload
# Or use FTP client CLI
```

**update-hostinger.bat** (Windows):
```batch
@echo off
npm run build
REM Then manually upload dist/ folder via FTP
```

## Quick Commands Reference

```bash
# Development
npm run dev              # Start local dev server

# Build
npm run build           # Build for production

# Deploy (automatic via GitHub)
git add .
git commit -m "Your changes"
git push origin main    # Triggers Vercel deployment

# Check deployment status
# Visit: vercel.com/dashboard
```

## Which Option Should I Use?

### Use Hostinger if:
- ✅ You want to use your existing domain immediately
- ✅ You prefer simple file upload workflow
- ✅ You don't mind manual uploads for updates
- ✅ You have Hostinger hosting already paid for

### Use Vercel if:
- ✅ You want automatic deployments from GitHub
- ✅ You want preview deployments for testing
- ✅ You want free hosting (Hostinger domain can still point here)
- ✅ You prefer zero-maintenance deployment

### Hybrid Approach (Best of Both):
1. Deploy to **Vercel** for automatic updates
2. Point your **Hostinger domain** to Vercel
3. Get automatic deployments + your custom domain

**How to point Hostinger domain to Vercel:**
1. Deploy on Vercel (get your Vercel URL)
2. In Hostinger DNS settings, add CNAME record:
   - Type: CNAME
   - Name: @ or www
   - Value: `your-app.vercel.app`
3. Or point A record to Vercel's IP (check Vercel docs for IP)

## Support

- Hostinger Docs: https://support.hostinger.com
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs

