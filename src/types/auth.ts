import { User } from '@supabase/supabase-js';

export type UserRole = 'casual' | 'organizer' | 'venue_owner' | 'admin';

export type UserProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  role?: UserRole;
};

export type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error?: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName?: string, role?: UserRole) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isOrganizer: () => boolean;
  isVenueOwner: () => boolean;
  isCasual: () => boolean;
};
