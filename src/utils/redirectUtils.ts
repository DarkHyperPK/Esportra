// Utility functions for role-based redirects
import { UserProfile } from '@/types/auth';

export const getDashboardPath = (profile: UserProfile | null): string => {
  if (!profile) {
    return '/user/dashboard'; // Default fallback
  }

  switch (profile.role) {
    case 'admin':
      return '/admin/dashboard';
    case 'organizer':
      return '/organizer/dashboard';
    case 'venue_owner':
      return '/venue-owner/dashboard';
    case 'player':
      return '/player/dashboard';
    case 'casual':
    default:
      return '/user/dashboard';
  }
};

export const getLandingPath = (profile: UserProfile | null): string => {
  if (!profile) {
    return '/'; // Home page for unauthenticated users
  }

  // For authenticated users, redirect to their appropriate dashboard
  return getDashboardPath(profile);
};
