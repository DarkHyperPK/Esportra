# Mobile App Guide - Building Native Apps

Your web app is already configured for mobile! You can build native iOS and Android apps using Capacitor.

## 📱 What You Already Have

✅ **Capacitor** - Already installed and configured  
✅ **Responsive Design** - Tailwind CSS with mobile breakpoints  
✅ **Mobile Navigation** - Mobile menu component  
✅ **Touch-Friendly UI** - Optimized for mobile interactions  
✅ **PWA Ready** - Can work as Progressive Web App

## 🚀 Quick Start: Build Mobile Apps

### Prerequisites

**For Android:**
- Android Studio (download from [developer.android.com](https://developer.android.com/studio))
- JDK 17 or higher
- Android SDK

**For iOS (Mac only):**
- Xcode (from Mac App Store)
- CocoaPods: `sudo gem install cocoapods`

### Step 1: Build Your Web App

First, build the production version:

```bash
# Install dependencies (if not done)
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with all your static files.

### Step 2: Install Capacitor CLI (if needed)

```bash
npm install -g @capacitor/cli
```

### Step 3: Initialize Capacitor Platforms

**For Android:**
```bash
# Add Android platform
npx cap add android

# Sync web assets to Android
npx cap sync android
```

**For iOS:**
```bash
# Add iOS platform
npx cap add ios

# Sync web assets to iOS
npx cap sync ios
```

### Step 4: Open in Native IDEs

**Android:**
```bash
npx cap open android
```
This opens Android Studio. Then:
1. Wait for Gradle sync to complete
2. Click "Run" (green play button) or press `Shift + F10`
3. Select an emulator or connected device
4. Your app will build and run!

**iOS:**
```bash
npx cap open ios
```
This opens Xcode. Then:
1. Select your device/simulator from the top bar
2. Click "Run" (play button) or press `Cmd + R`
3. Your app will build and run!

## 🔄 Update Workflow

After making changes to your web app:

```bash
# 1. Build web app
npm run build

# 2. Sync to native platforms
npx cap sync

# OR sync specific platform
npx cap sync android
npx cap sync ios

# 3. Open in IDE and test
npx cap open android
# or
npx cap open ios
```

## 📦 Build for Release

### Android APK/AAB:

**In Android Studio:**
1. Build → Generate Signed Bundle / APK
2. Choose "Android App Bundle" (recommended for Play Store) or APK
3. Select your keystore (create one if needed)
4. Choose release variant
5. Generate and sign

**Or via command line:**
```bash
cd android
./gradlew assembleRelease
# APK will be in: android/app/build/outputs/apk/release/
```

### iOS App:

**In Xcode:**
1. Product → Archive
2. Wait for archive to complete
3. Click "Distribute App"
4. Choose distribution method (App Store, Ad Hoc, Enterprise)
5. Follow the wizard

**For TestFlight/App Store:**
- You need an Apple Developer account ($99/year)
- Set up certificates and provisioning profiles
- Follow Apple's submission process

## 🎨 Mobile-Specific Optimizations

Your app already includes:
- ✅ Responsive layouts (mobile/tablet/desktop)
- ✅ Touch-friendly buttons and controls
- ✅ Mobile navigation menu
- ✅ Safe area support for notched devices
- ✅ Status bar styling
- ✅ Splash screen configuration

### Additional Mobile Features You Can Add:

**1. Pull to Refresh:**
```bash
npm install @capacitor-community/pull-to-refresh
```

**2. Status Bar Plugin:**
```bash
npm install @capacitor/status-bar
```

**3. Haptics (Vibration Feedback):**
```bash
npm install @capacitor/haptics
```

**4. Camera Access:**
```bash
npm install @capacitor/camera
```

**5. Push Notifications:**
```bash
npm install @capacitor/push-notifications
```

## 📱 Progressive Web App (PWA)

Your app can also work as a PWA without building native apps:

### Create `public/manifest.json`:

```json
{
  "name": "Frag & Book",
  "short_name": "FragBook",
  "description": "Esports Tournaments & Gaming Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#8b5cf6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/logo.svg",
      "sizes": "192x192",
      "type": "image/svg+xml"
    },
    {
      "src": "/logo.svg",
      "sizes": "512x512",
      "type": "image/svg+xml"
    }
  ]
}
```

### Add to `index.html`:
```html
<link rel="manifest" href="/manifest.json" />
```

### Test PWA:
1. Build: `npm run build`
2. Serve locally: `npm run preview`
3. Open in Chrome mobile
4. "Add to Home Screen" option will appear

## 🔧 Configuration

### Update App Info in `capacitor.config.json`:

```json
{
  "appId": "com.yourcompany.fragandbook",  // Change to your company
  "appName": "Frag & Book",                 // Your app name
  "webDir": "dist",                         // Build output folder
}
```

### Update Package Names:

**Android** (`android/app/build.gradle`):
```gradle
applicationId "com.yourcompany.fragandbook"
```

**iOS** (`ios/App/App.xcodeproj/project.pbxproj`):
- Update bundle identifier in Xcode

## 🎯 Mobile Testing Checklist

- [ ] Test on real devices (Android & iOS)
- [ ] Test on different screen sizes
- [ ] Test landscape orientation
- [ ] Test touch interactions
- [ ] Test offline functionality
- [ ] Test push notifications (if added)
- [ ] Test camera/photo uploads
- [ ] Test performance on low-end devices
- [ ] Test with slow network connection

## 📊 Performance Tips

1. **Optimize Images:**
   - Use WebP format
   - Lazy load images
   - Compress large images

2. **Code Splitting:**
   - Already handled by Vite
   - Routes are automatically code-split

3. **Minimize Bundle Size:**
   ```bash
   # Analyze bundle
   npm run build -- --analyze
   ```

4. **Enable Compression:**
   - Already configured in Hostinger `.htaccess`

## 🐛 Troubleshooting

### Issue: "Command not found: cap"
```bash
npm install -g @capacitor/cli
```

### Issue: Android build fails
- Make sure Android Studio is fully installed
- Check JDK version: `java -version` (should be 17+)
- Invalidate caches in Android Studio: File → Invalidate Caches

### Issue: iOS build fails
- Make sure Xcode Command Line Tools are installed: `xcode-select --install`
- Install CocoaPods: `sudo gem install cocoapods`
- Run `cd ios && pod install`

### Issue: App crashes on launch
- Check console logs in Android Studio/Xcode
- Verify all Capacitor plugins are installed
- Check `capacitor.config.json` for errors

### Issue: Web app not updating in native app
```bash
# Rebuild and sync
npm run build
npx cap sync
```

## 🚀 Deployment

### Google Play Store:
1. Build signed AAB (Android App Bundle)
2. Create Google Play Console account ($25 one-time fee)
3. Upload AAB to Play Console
4. Fill in store listing, screenshots, etc.
5. Submit for review

### Apple App Store:
1. Build and archive in Xcode
2. Upload via App Store Connect
3. Fill in app information
4. Submit for review

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
- [Apple Developer Resources](https://developer.apple.com/documentation)
- [PWA Guide](https://web.dev/progressive-web-apps/)

## 💡 Next Steps

1. ✅ **Build for production**: `npm run build`
2. ✅ **Add platforms**: `npx cap add android` and/or `npx cap add ios`
3. ✅ **Test on device**: Open in Android Studio/Xcode and run
4. ✅ **Customize**: Update app icons, splash screens, colors
5. ✅ **Add features**: Push notifications, camera, etc.
6. ✅ **Release**: Build signed releases for stores

---

**Your app is mobile-ready!** 🎉 Start by building and syncing to test on a device.

