# Deployment Guide for Hostinger

## Common Issues and Solutions

### Error: "Cannot read properties of undefined (reading 'createContext')"

This error occurs when React chunks aren't loading in the correct order. This has been fixed in the build configuration.

## Deployment Steps

### 1. Build the Project

```bash
npm run build
```

This creates a `dist` folder with all production files.

### 2. Upload to Hostinger

Upload **ALL contents** of the `dist` folder to your Hostinger hosting:

#### Option A: Root Domain (e.g., `yourdomain.com`)
- Upload all files from `dist/` to `public_html/`
- Make sure `index.html` is in the root of `public_html/`

#### Option B: Subdirectory (e.g., `yourdomain.com/demo`)
- Upload all files from `dist/` to `public_html/demo/`
- **IMPORTANT**: Update `vite.config.ts` base path:
  ```typescript
  base: '/demo/',  // Change from '/' to '/demo/'
  ```
- Rebuild: `npm run build`
- Upload the new `dist/` contents

### 3. File Structure on Hostinger

Your `public_html/` (or subdirectory) should look like:
```
public_html/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── react-vendor-[hash].js
│   ├── vendor-[hash].js
│   ├── ui-vendor-[hash].js
│   ├── supabase-vendor-[hash].js
│   └── index-[hash].css
├── favicon.ico
├── logo.svg
├── manifest.json
└── ... (other static files)
```

### 4. Important Checks

✅ **All files uploaded**: Make sure ALL files from `dist/` are uploaded, including the `assets/` folder

✅ **File permissions**: Ensure files are readable (644 for files, 755 for directories)

✅ **Base path**: If deploying to subdirectory, update `base` in `vite.config.ts` and rebuild

✅ **HTTPS**: Ensure your domain uses HTTPS (required for some features)

### 5. Testing After Deployment

1. Open browser DevTools (F12)
2. Check Console for errors
3. Check Network tab - ensure all `.js` and `.css` files load with status 200
4. If files return 404, check the file paths match what's in `index.html`

## Troubleshooting

### Issue: White screen / Nothing loads

**Solution**: 
- Check browser console for errors
- Verify all files uploaded correctly
- Check if base path is correct
- Ensure `index.html` is in the correct location

### Issue: 404 errors for assets

**Solution**:
- Verify `assets/` folder exists and contains all files
- Check file paths in browser Network tab
- If using subdirectory, update `base` path and rebuild

### Issue: React errors (createContext, etc.)

**Solution**:
- This should be fixed in the latest build
- Clear browser cache (Ctrl+Shift+Delete)
- Rebuild: `npm run build`
- Re-upload all files

### Issue: CORS errors

**Solution**:
- Ensure your Supabase project allows your domain
- Check Supabase dashboard → Settings → API → CORS settings

## Quick Rebuild Command

If you need to rebuild after making changes:

```bash
# Clean old build
rm -rf dist

# Build new version
npm run build

# Upload dist/ contents to Hostinger
```

## Version Tracking

After deployment, update the version in:
- `VERSION` file
- `package.json`
- `CHANGELOG.md`

Then commit and tag:
```bash
git add VERSION package.json CHANGELOG.md
git commit -m "Bump version to vX.Y.Z"
git tag -a vX.Y.Z -m "Version X.Y.Z"
git push && git push --tags
```
