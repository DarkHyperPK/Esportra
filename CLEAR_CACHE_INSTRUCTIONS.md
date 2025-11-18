# Clear Browser Cache - Step by Step

## The Problem
Your network tab shows files are loading from **disk cache** (see "(disk c...)" in the Size column). This means the browser is using OLD cached file content, even though the file names are new.

## Solution: Clear Cache Completely

### Method 1: Hard Refresh (Quickest)
1. Open your site in the browser
2. Press **`Ctrl + Shift + R`** (Windows) or **`Cmd + Shift + R`** (Mac)
3. This forces a hard reload

### Method 2: Empty Cache and Hard Reload (Recommended)
1. Open DevTools (F12)
2. **Right-click** on the refresh/reload button (next to the address bar)
3. Select **"Empty Cache and Hard Reload"**
4. Wait for page to reload

### Method 3: Clear Site Data (Most Thorough)
1. Open DevTools (F12)
2. Go to **Application** tab (or **Storage** in Firefox)
3. Click **"Clear site data"** button (top left)
4. Check **ALL boxes**:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
   - ✅ Service Workers
   - ✅ Storage
5. Click **"Clear site data"**
6. Close DevTools
7. Refresh the page normally

### Method 4: Test in Incognito/Private Window
1. Open a new **Incognito** (Chrome) or **Private** (Firefox) window
   - Chrome: `Ctrl + Shift + N` (Windows) or `Cmd + Shift + N` (Mac)
   - Firefox: `Ctrl + Shift + P` (Windows) or `Cmd + Shift + P` (Mac)
2. Navigate to your site
3. This bypasses ALL cache
4. If it works here, it confirms it's a cache issue

### Method 5: Browser Settings (Nuclear Option)
**Chrome:**
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cached images and files"**
3. Time range: **"All time"**
4. Click **"Clear data"**

**Firefox:**
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cache"**
3. Time range: **"Everything"**
4. Click **"Clear Now"**

## After Clearing Cache

1. **Check Network Tab Again:**
   - Files should NOT show "(disk c...)"
   - They should show actual file sizes
   - Status should still be 200

2. **Check Console:**
   - The `createContext` error should be gone
   - No React-related errors

3. **Verify Files:**
   - In Network tab, click on `react-vendor-u0lIU-hJ.js`
   - Go to "Response" or "Preview" tab
   - Search for "createContext" - it should be there
   - This confirms you're loading the NEW file content

## If Error Still Persists After Cache Clear

1. **Verify files on server:**
   - Open: `https://demo.esportra.com/assets/react-vendor-u0lIU-hJ.js`
   - Should see JavaScript code (not 404 or HTML error page)
   - Search for "createContext" in the file

2. **Check file upload:**
   - Verify all files from `dist/` folder were uploaded
   - Check file sizes match the build output
   - Re-upload if needed

3. **Check .htaccess:**
   - If you have a `.htaccess` file, make sure it's not blocking JS files
   - Or add cache-busting headers (see DEPLOYMENT_GUIDE.md)

## Quick Test

After clearing cache, open browser console and run:
```javascript
console.log('React loaded:', typeof React !== 'undefined');
console.log('createContext available:', typeof React?.createContext === 'function');
```

Both should be `true` if React loaded correctly.

