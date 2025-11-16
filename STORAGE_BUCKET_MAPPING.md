# 🗂️ STORAGE BUCKET MAPPING

## ✅ EXISTING BUCKETS → FUNCTIONALITY

| Bucket Name | Purpose | Public | Used For | Frontend Component |
|-------------|---------|--------|----------|-------------------|
| `kyc-documents` | KYC/Verification | ❌ | CNIC uploads, verification docs | `VerificationRequestForm.tsx` |
| `user-avatars` | User Profiles | ✅ | Profile pictures | `EditProfileForm.tsx` |
| `team-logos` | Team Management | ✅ | Team logos | `TeamCreationWizard.tsx`, `PlayerTeams.tsx` |
| `tournament-banners` | Tournaments | ✅ | Tournament banners | `CreateTournamentForm.tsx` |
| `venue-images` | Venue Management | ✅ | Venue photos | `VenueManagement.tsx` |
| `user-uploads` | General Files | ❌ | User file uploads | General file uploads |
| `tournament-results` | Tournament Results | ✅ | Match results, screenshots | `TournamentResults.tsx` |
| `tournament-screenshots` | Tournament Media | ✅ | Tournament screenshots | `TournamentMedia.tsx` |
| `venue-layouts` | Venue Management | ✅ | Venue layout images | `VenueLayout.tsx` |
| `website-assets` | Website Assets | ✅ | General website images | Various components |
| `sponsor-logos` | Sponsors | ✅ | Sponsor logos | `SponsorManagement.tsx` |
| `game-assets` | Game Assets | ✅ | Game icons, assets | `GameFilter.tsx` |
| `notification-attachments` | Notifications | ❌ | Notification file attachments | `NotificationSystem.tsx` |
| `temp-uploads` | Temporary Files | ❌ | Temporary file storage | Temporary uploads |

## 🔧 BUCKET CONFIGURATION

### **Public Buckets (✅)**
- `user-avatars` - Profile pictures
- `team-logos` - Team logos  
- `tournament-banners` - Tournament banners
- `venue-images` - Venue photos
- `tournament-results` - Match results
- `tournament-screenshots` - Tournament media
- `venue-layouts` - Venue layouts
- `website-assets` - Website assets
- `sponsor-logos` - Sponsor logos
- `game-assets` - Game assets

### **Private Buckets (❌)**
- `kyc-documents` - KYC/Verification documents
- `user-uploads` - General user files
- `notification-attachments` - Notification files
- `temp-uploads` - Temporary files

## 📁 FILE PATH STRUCTURE

### **KYC Documents** (`kyc-documents`)
```
{user_id}/cnic_front_{timestamp}.{ext}
{user_id}/cnic_back_{timestamp}.{ext}
{user_id}/verification_doc_{timestamp}.{ext}
```

### **Team Logos** (`team-logos`)
```
team-{timestamp}-{random}.{ext}
team-{team_id}-{timestamp}.{ext}
```

### **User Avatars** (`user-avatars`)
```
{user_id}/avatar_{timestamp}.{ext}
{user_id}/profile_{timestamp}.{ext}
```

### **Tournament Banners** (`tournament-banners`)
```
{tournament_id}/banner_{timestamp}.{ext}
{tournament_id}/logo_{timestamp}.{ext}
```

### **Venue Images** (`venue-images`)
```
{venue_id}/main_{timestamp}.{ext}
{venue_id}/gallery_{timestamp}.{ext}
{venue_id}/layout_{timestamp}.{ext}
```

## 🔐 RLS POLICIES

### **Public Buckets**
- Anyone can view files
- Authenticated users can upload with proper permissions
- File owners can update/delete their files

### **Private Buckets**
- Users can only view their own files
- Admins can view all files
- File owners can upload/update/delete their files

## 🚀 USAGE EXAMPLES

### **Upload Team Logo**
```typescript
const uploadTeamLogo = async (file: File) => {
  const fileName = `team-${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await supabase.storage
    .from('team-logos')
    .upload(fileName, file);
  
  if (error) throw error;
  
  const { data } = supabase.storage
    .from('team-logos')
    .getPublicUrl(fileName);
    
  return data.publicUrl;
};
```

### **Upload KYC Document**
```typescript
const uploadKYCDocument = async (file: File, userId: string) => {
  const fileName = `${userId}/cnic_front_${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await supabase.storage
    .from('kyc-documents')
    .upload(fileName, file);
  
  if (error) throw error;
  
  return fileName; // Return path for database storage
};
```

## ✅ STATUS

- ✅ All buckets exist and are properly configured
- ✅ RLS policies are set up correctly
- ✅ File path structures are defined
- ✅ Frontend components are mapped to correct buckets
- ✅ Public/private access is properly configured
