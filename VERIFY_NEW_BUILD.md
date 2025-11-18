# Verify You're Using the New Build

## Quick Check: Which Files Are Loading?

### Step 1: Check File Names in Network Tab

Open DevTools (F12) → Network tab → Refresh page

**Look for these file names in the NEW build:**
- ✅ `react-vendor-u0llU-hJ.js` (or similar hash starting with `react-vendor-`)
- ✅ `vendor-BEHJ5g2_.js` (or similar hash)
- ✅ `index-BLkmxU10.js` (or similar hash)

**If you see these OLD file names, you're using cached files:**
- ❌ `vendor-AHukVjit.js` ← OLD FILE
- ❌ Any file without `react-vendor-` prefix

### Step 2: Check File Sizes

In Network tab, check the file sizes:

**New Build Sizes:**
- `react-vendor-*.js` should be ~150-160 KB
- `vendor-*.js` should be ~800 KB
- `index-*.js` should be ~120-130 KB

If sizes don't match, you're loading old files.

### Step 3: Force Load New Files

**Method 1: Hard Refresh**
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Method 2: Clear Cache Completely**
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Method 3: Clear Site Data**
1. DevTools → Application tab
2. Click "Clear site data" button
3. Check all boxes
4. Click "Clear site data"
5. Refresh page

**Method 4: Test in Incognito**
- Open new incognito/private window
- Navigate to your site
- This bypasses all cache

### Step 4: Verify Files on Server

Check if the NEW files are actually on Hostinger:

1. Open: `https://yourdomain.com/assets/react-vendor-u0llU-hJ.js`
   - Should see JavaScript code (not 404)
   - Should contain `createContext` if you search in the file

2. Open: `https://yourdomain.com/assets/vendor-BEHJ5g2_.js`
   - Should see JavaScript code
   - Should NOT contain React code (no `createContext`)

3. If either file is 404, the files weren't uploaded correctly.

### Step 5: Check Console Error Details

When the error occurs, check:
- **Which file** is throwing the error?
- **What's the exact error message?**
- **What line number?**

If it says `vendor-AHukVjit.js` → You're loading OLD files (cache issue)
If it says `vendor-BEHJ5g2_.js` → Different issue (file might be corrupted)

## Still Having Issues?

### Option A: Add Cache-Busting Headers

If Hostinger allows `.htaccess`, add this to prevent caching:

```apache
<IfModule mod_headers.c>
  <FilesMatch "\.(js|css)$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
    Header set Expires "0"
  </FilesMatch>
</IfModule>
```

### Option B: Verify Upload

1. Check Hostinger file manager
2. Verify `assets/` folder contains:
   - `react-vendor-u0llU-hJ.js`
   - `vendor-BEHJ5g2_.js`
   - `index-BLkmxU10.js`
   - All other `.js` files
3. Check file sizes match the build output
4. Re-upload if files are missing or wrong size

### Option C: Check File Permissions

On Hostinger, ensure:
- Files: 644 (readable)
- Folders: 755 (readable, executable)

## Test Command

Open browser console and run:
```javascript
// Check if React is loaded
console.log('React:', typeof React);
console.log('React.createContext:', typeof React?.createContext);

// Check loaded scripts
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('.js'))
  .forEach(r => console.log(r.name, r.transferSize + ' bytes'));
```

This will show:
1. If React is available
2. All JS files that loaded and their sizes

