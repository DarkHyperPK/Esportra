# Database Connection Test - Verify Supabase Sync

Your website is already connected to Supabase! The credentials are baked into your build.

## ✅ How It Works

- **Website (Hostinger)**: Frontend files only
- **Database (Supabase)**: Cloud database, already connected
- **Connection**: Your website talks to Supabase via API (real-time)

**No sync needed** - Everything happens in real-time automatically!

## 🧪 Test the Connection

### Step 1: Test on Your Live Website

1. Visit: `https://demo.esportra.com`
2. Open browser console (F12)
3. Try these actions:

**Test Sign Up:**
- Click "Sign Up"
- Create a test account
- Check console for errors

**Test Sign In:**
- Sign in with your account
- Check if you can access dashboard

**Test Database Operations:**
- Create a team
- Register for a tournament
- Check if data appears

### Step 2: Verify in Supabase Dashboard

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Table Editor**
4. Check if data appears when you:
   - Sign up (should see row in `profiles` table)
   - Create team (should see row in `teams` table)
   - Register for tournament (should see row in `tournament_participants`)

## 🔍 Check Connection Status

### In Browser Console (F12):

Look for these indicators:
- ✅ No Supabase connection errors
- ✅ Network requests to `*.supabase.co` are successful
- ✅ Data loads when you navigate pages

### Common Issues:

**If you see CORS errors:**
- Go to Supabase Dashboard → Settings → API
- Add `https://demo.esportra.com` to allowed origins

**If you see "permission denied" errors:**
- Check RLS (Row Level Security) policies in Supabase
- Make sure policies allow public access where needed

**If data doesn't appear:**
- Check browser console for specific errors
- Verify tables exist in Supabase
- Check RLS policies

## 🎯 Quick Verification Checklist

Test these on `https://demo.esportra.com`:

- [ ] Can sign up (creates user in database)
- [ ] Can sign in (reads from database)
- [ ] Can view tournaments (reads from database)
- [ ] Can create team (writes to database)
- [ ] Can register for tournament (writes to database)
- [ ] Data persists after page refresh (stored in database)

## 🔄 Real-Time Sync

Supabase automatically syncs in real-time:
- ✅ Changes on website → Instantly saved to database
- ✅ Changes in database → Instantly visible on website (if using real-time subscriptions)
- ✅ No manual sync needed

## 🛠️ If Something Doesn't Work

1. **Check Browser Console (F12)**:
   - Look for red errors
   - Check Network tab for failed requests

2. **Check Supabase Dashboard**:
   - Go to Logs → API Logs
   - See if requests are coming through
   - Check for errors

3. **Verify Credentials**:
   - Make sure `.env.production` has correct Supabase URL and key
   - Rebuild if you changed credentials: `npm run build`
   - Re-upload to Hostinger

---

**Your database is already synced!** Just test the features to make sure everything works. 🚀

