# 🗂️ Storage Bucket Code Mapping - Verification Report

## ✅ Current Buckets in Your Project

Based on your bucket list, here's the complete mapping:

### Users Domain
- ✅ `users.avatars` (public)
- ✅ `users.documents.kyc` (private)
- ✅ `users.uploads` (private)

### Tournaments Domain
- ✅ `tournaments.banners` (public)
- ✅ `tournaments.results` (public)
- ✅ `tournaments.media` (public)
- ✅ `tournaments.disputes.evidence` (public)

### Teams Domain
- ✅ `teams.logos` (public)

### Venues Domain
- ✅ `venues.images` (public)
- ✅ `venues.layouts` (public)

### System Domain
- ✅ `system.assets.games` (public)
- ✅ `system.assets.sponsors` (public)
- ✅ `system.assets.website` (public)
- ✅ `system.notifications.attachments` (private)
- ✅ `system.temp` (private)

## ✅ Code References - All Verified

### Users Domain

#### `users.avatars` ✅
- **File**: `src/components/profile/EditProfileForm.tsx`
- **Usage**: User avatar uploads
- **Status**: ✅ Correctly mapped

#### `users.documents.kyc` ✅
- **Files**: 
  - `src/components/verification/VenueOwnerVerificationForm.tsx`
  - `src/components/verification/OrganizerVerificationForm.tsx`
  - `src/pages/admin/tools/VerificationSystem.tsx`
- **Usage**: KYC document uploads and viewing
- **Status**: ✅ Correctly mapped

#### `users.uploads` ✅
- **Usage**: General user file uploads
- **Status**: ✅ Bucket exists, ready for use

### Tournaments Domain

#### `tournaments.banners` ✅
- **Usage**: Tournament banner images
- **Status**: ✅ Bucket exists, may need code reference if tournament creation uses banners

#### `tournaments.results` ✅
- **File**: `src/components/tournament/MatchResultUpload.tsx`
- **Usage**: Match result screenshots
- **Status**: ✅ Correctly mapped

#### `tournaments.media` ✅
- **Usage**: Tournament media and screenshots
- **Status**: ✅ Bucket exists, ready for use

#### `tournaments.disputes.evidence` ✅
- **Files**:
  - `src/components/organizer/DisputeCenter.tsx`
  - `src/components/player/DisputeSubmission.tsx`
  - `src/pages/user/RaiseDispute.tsx`
- **Usage**: Dispute evidence and comment attachments
- **Status**: ✅ Correctly mapped

### Teams Domain

#### `teams.logos` ✅
- **Files**:
  - `src/components/player/TeamCreationWizard.tsx`
  - `src/components/player/PlayerTeams.tsx`
  - `src/pages/player/Teams.tsx`
  - `src/components/tournament/TournamentRegistration.tsx`
- **Usage**: Team logo uploads
- **Status**: ✅ Correctly mapped

### Venues Domain

#### `venues.images` ✅
- **Usage**: Venue photos
- **Status**: ✅ Bucket exists, may need code reference if venue management uses images

#### `venues.layouts` ✅
- **Usage**: Venue layout images
- **Status**: ✅ Bucket exists, may need code reference if venue management uses layouts

### System Domain

#### `system.assets.games` ✅
- **Usage**: Game-related assets
- **Status**: ✅ Bucket exists, may need code reference if game assets are uploaded

#### `system.assets.sponsors` ✅
- **Usage**: Sponsor logos
- **Status**: ✅ Bucket exists, may need code reference if sponsor management exists

#### `system.assets.website` ✅
- **Usage**: Website assets
- **Status**: ✅ Bucket exists, ready for use

#### `system.notifications.attachments` ✅
- **Usage**: Notification file attachments
- **Status**: ✅ Bucket exists, ready for use

#### `system.temp` ✅
- **Usage**: Temporary file storage
- **Status**: ✅ Bucket exists, ready for use

## 📋 Summary

### ✅ Fully Mapped (Code References Exist)
- `users.avatars` - EditProfileForm.tsx
- `users.documents.kyc` - Verification forms + admin tools
- `tournaments.results` - MatchResultUpload.tsx
- `tournaments.disputes.evidence` - Dispute components
- `teams.logos` - Team management components

### ✅ Buckets Ready (No Code References Yet)
- `users.uploads` - Ready for general uploads
- `tournaments.banners` - Ready for tournament banners
- `tournaments.media` - Ready for tournament media
- `venues.images` - Ready for venue photos
- `venues.layouts` - Ready for venue layouts
- `system.assets.games` - Ready for game assets
- `system.assets.sponsors` - Ready for sponsor logos
- `system.assets.website` - Ready for website assets
- `system.notifications.attachments` - Ready for notifications
- `system.temp` - Ready for temp files

## 🧪 Testing Checklist

Test these functionalities to verify bucket mappings:

- [ ] **User Avatar Upload** → `users.avatars`
  - Go to profile settings
  - Upload a new avatar
  - Verify it appears correctly

- [ ] **KYC Document Upload** → `users.documents.kyc`
  - Submit organizer/venue verification
  - Upload CNIC documents
  - Verify admin can view them

- [ ] **Team Logo Upload** → `teams.logos`
  - Create/edit a team
  - Upload team logo
  - Verify logo displays correctly

- [ ] **Match Result Upload** → `tournaments.results`
  - Submit match results
  - Upload result screenshots
  - Verify uploads work

- [ ] **Dispute Evidence Upload** → `tournaments.disputes.evidence`
  - File a dispute
  - Upload evidence
  - Add comment with attachment
  - Verify files are accessible

## ✅ All Code References Verified

**Status**: All existing code references are correctly using the new bucket names!

No old bucket names found in the codebase. All components are ready to test.

