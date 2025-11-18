# Upload Checklist - Fix React Error

## Current Problem
Server is serving OLD files:
- ❌ `vendor-DZQY2xxM.js` (should NOT exist)
- ❌ `0-react-vendor-CiCkWRzl.js` (old version)
- ❌ `supabase-vendor-BioxluXV.js` (old version)

## What Should Be on Server (NEW files)
- ✅ `0-react-vendor-qhAL2tGv.js` (1.1 MB)
- ✅ `supabase-vendor-BshHZ1T9.js` (108 KB)
- ✅ `index-3sXIkIq-.js`
- ✅ NO `vendor-*.js` file (except supabase-vendor)

## Step-by-Step Upload Instructions

### Step 1: Locate Your Local Build
Your local `dist/` folder is at:
```
C:\Users\Mudassir\Downloads\frag-and-book-main\dist\
```

### Step 2: Access Hostinger File Manager
1. Log into Hostinger control panel
2. Go to **File Manager**
3. Navigate to your website directory:
   - If using root domain: `public_html/`
   - If using subdomain: `public_html/demo/` (or your subdomain folder)

### Step 3: Delete OLD Files
**IMPORTANT**: Delete ALL existing files in the website directory:
- Delete `index.html`
- Delete entire `assets/` folder
- Delete all `.js`, `.css`, and other files
- Keep only if you have custom files you need

### Step 4: Upload NEW Files
1. Select ALL files from your local `dist/` folder:
   - `index.html`
   - `assets/` folder (with all contents)
   - `favicon.ico`
   - `logo.svg`
   - `manifest.json`
   - Any other files in `dist/`

2. Upload them to Hostinger (drag and drop or use upload button)

### Step 5: Verify Upload
After uploading, check these files exist on Hostinger:
- ✅ `index.html` (should reference `0-react-vendor-qhAL2tGv.js`)
- ✅ `assets/0-react-vendor-qhAL2tGv.js` (1,098,441 bytes = ~1.1 MB)
- ✅ `assets/supabase-vendor-BshHZ1T9.js` (108,686 bytes)
- ✅ `assets/index-3sXIkIq-.js`
- ❌ NO `vendor-DZQY2xxM.js` file

### Step 6: Test
1. Open incognito window
2. Visit your site
3. Open DevTools → Network tab
4. Refresh page
5. Check for:
   - `0-react-vendor-qhAL2tGv.js` (NOT `CiCkWRzl`)
   - `supabase-vendor-BshHZ1T9.js` (NOT `BioxluXV`)
   - NO `vendor-DZQY2xxM.js`

## If Still Not Working

### Check 1: File Permissions
On Hostinger, ensure files are readable:
- Files: 644
- Folders: 755

### Check 2: Base Path
If your site is at `demo.esportra.com/demo/` (subdirectory):
- Check if files are in `public_html/demo/` folder
- Or update `vite.config.ts` base path to `/demo/` and rebuild

### Check 3: File Names Match
Open `index.html` on Hostinger and verify it references:
- `0-react-vendor-qhAL2tGv.js`
- `supabase-vendor-BshHZ1T9.js`

If it references different files, the wrong `index.html` was uploaded.

## Quick Test Command
After uploading, you can test by directly accessing:
- `https://demo.esportra.com/assets/0-react-vendor-qhAL2tGv.js`
- Should return JavaScript code (not 404)

If you get 404, the file wasn't uploaded correctly.

