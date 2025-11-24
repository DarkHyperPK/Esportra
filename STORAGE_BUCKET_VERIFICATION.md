# ✅ Storage Bucket Code Mapping - Complete Verification

## Your Current Buckets

Based on your bucket list, here's the complete mapping to your codebase:

### ✅ Users Domain

#### `users.avatars` (public)
- **File**: `src/components/profile/EditProfileForm.tsx`
- **Lines**: 62, 67
- **Status**: ✅ Correctly mapped

#### `users.documents.kyc` (private)
- **Files**: 
  - `src/components/verification/VenueOwnerVerificationForm.tsx` (lines 74, 88, 91)
  - `src/components/verification/OrganizerVerificationForm.tsx` (lines 125, 133, 140, 143)
  - `src/pages/admin/tools/VerificationSystem.tsx` (lines 284, 288, 294, 298, 302)
- **Status**: ✅ Correctly mapped

#### `users.uploads` (private)
- **Status**: ✅ Bucket exists, ready for use (no code references yet)

### ✅ Tournaments Domain

#### `tournaments.banners` (public)
- **Status**: ✅ Bucket exists, ready for use
- **Note**: Tournament creation doesn't upload banners directly (uses URL input)

#### `tournaments.results` (public)
- **File**: `src/components/tournament/MatchResultUpload.tsx`
- **Lines**: 61, 63
- **Status**: ✅ Correctly mapped

#### `tournaments.media` (public)
- **Status**: ✅ Bucket exists, ready for use (no code references yet)

#### `tournaments.disputes.evidence` (public)
- **Files**:
  - `src/components/organizer/DisputeCenter.tsx` (lines 388, 394)
  - `src/components/player/DisputeSubmission.tsx` (lines 214, 220)
  - `src/pages/user/RaiseDispute.tsx` (lines 345, 351)
- **Status**: ✅ Correctly mapped

### ✅ Teams Domain

#### `teams.logos` (public)
- **Files**:
  - `src/components/player/TeamCreationWizard.tsx` (lines 279, 296)
  - `src/components/player/PlayerTeams.tsx` (lines 95, 97)
  - `src/pages/player/Teams.tsx` (lines 275, 292, 415)
  - `src/components/tournament/TournamentRegistration.tsx` (lines 94, 96)
- **Status**: ✅ Correctly mapped

### ✅ Venues Domain

#### `venues.images` (public)
- **File**: `src/components/admin/VenueEditModal.tsx`
- **Lines**: 84, 93
- **Status**: ✅ **FIXED** - Was using `'venues'`, now using `'venues.images'`

#### `venues.layouts` (public)
- **Status**: ✅ Bucket exists, ready for use (no code references yet)

### ✅ System Domain

#### `system.assets.games` (public)
- **Status**: ✅ Bucket exists, ready for use
- **Note**: `GameFilter.tsx` doesn't upload files, only filters

#### `system.assets.sponsors` (public)
- **Status**: ✅ Bucket exists, ready for use (no code references yet)

#### `system.assets.website` (public)
- **Status**: ✅ Bucket exists, ready for use (no code references yet)

#### `system.notifications.attachments` (private)
- **Status**: ✅ Bucket exists, ready for use (no code references yet)

#### `system.temp` (private)
- **Status**: ✅ Bucket exists, ready for use (no code references yet)

## 🔧 Fixes Applied

1. ✅ **VenueEditModal.tsx** - Updated from `'venues'` → `'venues.images'`

## 📋 Testing Checklist

Test these functionalities to verify all bucket mappings work:

### Users Domain
- [ ] **User Avatar Upload** → `users.avatars`
  - Go to profile settings
  - Upload avatar
  - Verify it displays

- [ ] **KYC Document Upload** → `users.documents.kyc`
  - Submit organizer/venue verification
  - Upload CNIC documents
  - Verify admin can view (signed URLs)

### Tournaments Domain
- [ ] **Match Result Upload** → `tournaments.results`
  - Submit match results
  - Upload screenshots
  - Verify uploads work

- [ ] **Dispute Evidence** → `tournaments.disputes.evidence`
  - File a dispute with evidence
  - Add comment with attachment
  - Verify files are accessible

### Teams Domain
- [ ] **Team Logo Upload** → `teams.logos`
  - Create/edit team
  - Upload logo
  - Verify logo displays

### Venues Domain
- [ ] **Venue Image Upload** → `venues.images`
  - Edit venue
  - Upload venue image
  - Verify image displays

## ✅ Summary

**All code references verified and fixed!**

- ✅ No old bucket names found
- ✅ All active uploads use correct new bucket names
- ✅ All buckets exist and are properly configured
- ✅ Ready for testing

**Status**: Your codebase is fully mapped to the new bucket structure! 🎉

