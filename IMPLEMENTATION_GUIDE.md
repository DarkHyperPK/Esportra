# End-to-End Feature Implementation Guide

> **Version 2.0** — Last Updated: January 2026
> A comprehensive guide for implementing features in the Esportra esports platform.

---

## Table of Contents
1. [Core Mandate](#1-core-mandate)
2. [Project Architecture](#2-project-architecture)
3. [Implementation Protocol](#3-implementation-protocol)
4. [Backend Development](#4-backend-development)
5. [Frontend Development](#5-frontend-development)
6. [State Management](#6-state-management)
7. [Storage & Media](#7-storage--media)
8. [Real-time Features](#8-real-time-features)
9. [Testing & Verification](#9-testing--verification)
10. [Common Patterns](#10-common-patterns)

---

## 1. Core Mandate

**For every feature request, the implementation must be End-to-End (E2E).** UI-only changes are strict anti-patterns and are not permitted unless explicitly requested for prototyping purposes.

### Anti-Patterns to Avoid
| Anti-Pattern | Why It's Bad | Correct Approach |
|--------------|--------------|------------------|
| UI-only changes | Data doesn't persist | Implement full backend first |
| Raw Supabase calls in components | Violates separation of concerns | Use custom hooks |
| Skipping RLS policies | Security vulnerability | Always define policies |
| Hardcoded data | Not maintainable | Fetch from database |

---

## 2. Project Architecture

### Directory Structure
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base components (Button, Card, Dialog, etc.)
│   ├── tournament/      # Tournament-specific components
│   ├── organizer/       # Organizer profile components
│   ├── player/          # Player-specific components
│   ├── bracket/         # Bracket visualization components
│   ├── admin/           # Admin panel components
│   └── navigation/      # Navbar, sidebar components
│
├── pages/               # Route-level components
│   ├── tournaments/     # Tournament pages
│   ├── organizer/       # Organizer pages
│   ├── admin/           # Admin pages
│   └── auth/            # Authentication pages
│
├── hooks/               # Custom React hooks (data fetching, mutations)
│   ├── useTeamManagement.ts
│   ├── useTournamentWizard.ts
│   ├── useProfileManagement.ts
│   └── ... (32+ hooks)
│
├── services/            # Business logic & API services
│   ├── bracket/         # Bracket generation logic
│   └── vetoService/     # Map veto system
│
├── lib/                 # Core utilities
│   ├── supabase.ts      # Supabase client
│   ├── imageUtils.ts    # Image manipulation (crop, brightness)
│   └── queryClient.ts   # TanStack Query client
│
├── contexts/            # React contexts
│   └── AuthContext.tsx  # Authentication state
│
├── types/               # TypeScript type definitions
│
└── utils/               # Utility functions
```

### Key Technologies
| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | React 18 + Vite | UI framework |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | Radix UI + shadcn/ui | Accessible components |
| **State** | TanStack Query | Server state management |
| **Backend** | Supabase | Database, Auth, Storage |
| **Animation** | Framer Motion | UI animations |

---

## 3. Implementation Protocol

When receiving a feature request (e.g., "Add a Like button"), follow this strict checklist:

### Phase 1: Backend Verification & Implementation
1. **Database Schema**
   - Does the table/column exist?
   - If NO: Create a migration in `supabase/migrations/`
   
2. **Security (RLS)**
   - Can the user perform this action?
   - If NO: Add RLS policies

3. **APIs/Functions**
   - Is a server-side function needed?
   - If YES: Create an RPC function or Edge Function

### Phase 2: Logic Layer (Frontend)
1. **Custom Hooks**
   - Create/update hooks in `src/hooks/`
   - Handle loading, error, and success states
   - Implement cache invalidation

2. **Type Definitions**
   - Update types in `src/types/` to match schema

### Phase 3: UI Implementation
1. **Component**
   - Build the interface in `src/components/`
   - Follow the UI Style Guide

2. **Integration**
   - Connect UI events to hooks
   - Implement loading and error feedback

### Phase 4: Verification
1. **Data Integrity**
   - Perform action → Query DB → Verify persistence
   
2. **State Sync**
   - Refresh page → Verify state persists

---

## 4. Backend Development

### Creating Migrations
```sql
-- File: supabase/migrations/YYYYMMDD_feature_name.sql

-- Create table
CREATE TABLE IF NOT EXISTS public.feature_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_table ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data"
    ON public.feature_table FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
    ON public.feature_table FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

### Common RLS Patterns
| Pattern | Use Case | Policy |
|---------|----------|--------|
| **Owner-only** | Private data | `auth.uid() = user_id` |
| **Public Read** | Profiles, tournaments | `USING (true)` for SELECT |
| **Role-based** | Admin features | Check `profiles.role` or `admin_roles` |
| **Organizer** | Tournament management | `auth.uid() = organizer_id` |

### Storage Buckets
| Bucket | Purpose | Public |
|--------|---------|--------|
| `users.avatars` | User profile pictures | Yes |
| `organizer-banners` | Organizer profile banners | Yes |
| `organizer-media` | Organizer media gallery | Yes |
| `tournaments.banners` | Tournament cover images | Yes |
| `tournaments.media` | Tournament photos/videos | Yes |
| `teams.logos` | Team logos | Yes |

---

## 5. Frontend Development

### Creating Custom Hooks

```typescript
// src/hooks/useFeature.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useFeature = (featureId: string) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Query
    const { data, isLoading, error } = useQuery({
        queryKey: ['feature', featureId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('feature_table')
                .select('*')
                .eq('id', featureId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: !!featureId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Mutation
    const updateFeature = useMutation({
        mutationFn: async (updates: Partial<Feature>) => {
            const { data, error } = await supabase
                .from('feature_table')
                .update(updates)
                .eq('id', featureId);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feature', featureId] });
            toast({ title: 'Updated!', description: 'Changes saved.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        },
    });

    return { data, isLoading, error, updateFeature };
};
```

### Query Configuration Best Practices
```typescript
{
    staleTime: 1000 * 60 * 5,   // 5 min - data considered fresh
    gcTime: 1000 * 60 * 30,     // 30 min - cache garbage collection
    enabled: !!dependency,      // Conditional fetching
    refetchOnWindowFocus: false, // Prevent refetch on tab switch
}
```

---

## 6. State Management

### TanStack Query Keys
Use consistent, hierarchical query keys:
```typescript
['tournaments']                    // All tournaments
['tournaments', tournamentId]      // Single tournament
['tournaments', tournamentId, 'participants']  // Tournament participants
['organizer-profile', slug]        // Organizer profile
['organizer-media', organizerId]   // Organizer media gallery
```

### Cache Invalidation
```typescript
// After mutation success
queryClient.invalidateQueries({ queryKey: ['tournaments', tournamentId] });

// Invalidate all related queries
queryClient.invalidateQueries({ queryKey: ['tournaments'] });
```

---

## 7. Storage & Media

### File Upload Pattern
```typescript
const uploadFile = async (file: File, bucket: string, path: string) => {
    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

    return publicUrl;
};
```

### Image Processing
Use `src/lib/imageUtils.ts` for:
- **Cropping**: `getCroppedImg(image, crop, brightness)`
- **Resizing**: Canvas-based resizing
- **Brightness adjustment**: CSS filter or canvas manipulation

### Media Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `BannerEditor` | `components/organizer/` | Crop/resize/brightness for banners |
| `MediaUploadDialog` | `components/organizer/` | Multi-file upload with descriptions |
| `MediaLightbox` | `components/organizer/` | Instagram-style image viewer |

---

## 8. Real-time Features

### Supabase Realtime Subscriptions
```typescript
useEffect(() => {
    const channel = supabase
        .channel('table-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'matches' },
            (payload) => {
                // Handle real-time update
                queryClient.invalidateQueries({ queryKey: ['matches'] });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}, []);
```

### Real-time Enabled Tables
- `brkt_matches` - Bracket match updates
- `brkt_versions` - Bracket version changes
- `match_map_vetos` - Map veto state
- `match_map_veto_actions` - Veto actions
- `notifications` - User notifications

---

## 9. Testing & Verification

### Manual Verification Checklist
- [ ] Perform action in UI
- [ ] Check browser console for errors
- [ ] Query database to verify data persistence
- [ ] Refresh page to verify state sync
- [ ] Test with different user roles
- [ ] Test edge cases (empty states, errors)

### Common Debugging Steps
1. **Check Console**: Look for errors in browser DevTools
2. **Check Network Tab**: Verify API calls succeed
3. **Check Supabase Logs**: Review database logs
4. **Check RLS**: Test policies in Supabase SQL editor

---

## 10. Common Patterns

### Example: Profile Picture Upload
1. **Backend**: 
   - Verify `users.avatars` bucket exists
   - Check `profiles.avatar_url` column
   
2. **Logic**: 
   - Use `useProfileManagement` hook
   - Handle file upload + DB update
   
3. **UI**: 
   - Create Camera Icon overlay component
   - Trigger file input on click
   
4. **Verify**: 
   - Upload image → Refresh → Verify persistence

### Example: Tournament Registration
1. **Backend**:
   - Check `tournament_participants` table
   - Verify RLS allows registration
   
2. **Logic**:
   - Use `useTournamentRegistrationStatus` hook
   - Handle team selection and submission
   
3. **UI**:
   - Create registration modal
   - Show loading/success/error states
   
4. **Verify**:
   - Register → Check participants table → Verify count

### Example: Media Gallery
1. **Backend**:
   - Create `organizer_media` table with RLS
   - Create `organizer-media` storage bucket
   
2. **Logic**:
   - Create multi-file upload handler
   - Handle descriptions and metadata
   
3. **UI**:
   - Create `MediaUploadDialog` for batch uploads
   - Create `MediaLightbox` for viewing
   
4. **Verify**:
   - Upload multiple files → View in gallery → Click to open lightbox

---

## Quick Reference

### File Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `MediaUploadDialog.tsx` |
| Hooks | camelCase with `use` prefix | `useTeamManagement.ts` |
| Utilities | camelCase | `imageUtils.ts` |
| Migrations | Date prefix | `20260128_create_media_table.sql` |

### Import Aliases
```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
```

### Toast Notifications
```typescript
// Success
toast({ title: 'Success!', description: 'Action completed.' });

// Error
toast({ title: 'Error', description: error.message, variant: 'destructive' });

// Warning
toast({ title: 'Warning', description: 'Please check...', variant: 'warning' });
```

---

## Related Documents
- [UI Style Guide](./UI_STYLE_GUIDE.md) - Design system and component styling
- [Database Schema](./supabase/migrations/) - Migration files
- [API Documentation](./src/services/) - Service layer documentation
