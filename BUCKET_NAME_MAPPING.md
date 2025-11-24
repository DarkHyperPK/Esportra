# 🗂️ Storage Bucket Name Mapping

## Professional Domain-Based Structure

All storage buckets now follow a consistent naming pattern:
```
{domain}.{category}.{subcategory}
```

## Complete Bucket List

### Users Domain
- `users.avatars` - User profile pictures
- `users.documents.kyc` - KYC/verification documents
- `users.uploads` - General user file uploads

### Tournaments Domain
- `tournaments.banners` - Tournament banner images
- `tournaments.results` - Match results and screenshots
- `tournaments.media` - Tournament media and screenshots
- `tournaments.disputes.evidence` - Dispute evidence and attachments

### Teams Domain
- `teams.logos` - Team logo images

### Venues Domain
- `venues.images` - Venue photos
- `venues.layouts` - Venue layout images

### System Domain
- `system.assets.games` - Game-related assets
- `system.assets.website` - Website assets
- `system.assets.sponsors` - Sponsor logos
- `system.notifications.attachments` - Notification attachments
- `system.temp` - Temporary file storage

## Migration Status

✅ **Updated Components:**
- `DisputeCenter.tsx` → `tournaments.disputes.evidence`
- `DisputeSubmission.tsx` → `tournaments.disputes.evidence`
- `RaiseDispute.tsx` → `tournaments.disputes.evidence`

⚠️ **Needs Update:**
- `VerificationSystem.tsx` → `users.documents.kyc`
- `TeamCreationWizard.tsx` → `teams.logos`
- `PlayerTeams.tsx` → `teams.logos`
- `Teams.tsx` → `teams.logos`
- `TournamentRegistration.tsx` → `teams.logos`
- `MatchResultUpload.tsx` → `tournaments.results`
- `EditProfileForm.tsx` → `users.avatars`
- `VenueOwnerVerificationForm.tsx` → `users.documents.kyc`
- `OrganizerVerificationForm.tsx` → `users.documents.kyc`

## Benefits

1. **Clear Organization**: Domain-based grouping
2. **Scalability**: Easy to add new categories
3. **Professional**: Industry-standard naming
4. **Maintainability**: Clear hierarchy
5. **Self-Documenting**: Names explain purpose

