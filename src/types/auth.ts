import { User } from '@supabase/supabase-js';

export type UserRole = 'casual' | 'organizer' | 'venue_owner' | 'admin' | 'player';

export type UserProfile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_seed?: string | null;
  avatar_style?: string | null;
  email: string | null;
  role?: UserRole;
  bio?: string | null;
  social_links?: any | null; // using any for flexibility with JSONB
  card_image_url?: string | null;
  riot_tag?: string | null;
  steam_tag?: string | null;
  country_code?: string | null;
  timezone_iana?: string | null;
  date_of_birth?: string | null;
  is_admin?: boolean;
  admin_roles?: string[];
  base_role?: UserRole;
  license_id?: string | null;
  is_suspended?: boolean;
  suspension_until?: string | null;
  suspension_reason?: string | null;
  suspension_type?: string | null;
  privacy_settings?: {
    show_riot_account: boolean;
    show_steam_account: boolean;
  } | null;
};

export type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error?: string | null;
  isEmailVerified: boolean;
  signIn: (email: string, password: string, redirectTo?: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName?: string,
    role?: UserRole,
    dateOfBirth?: string,
    countryCode?: string,
  ) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithDiscord: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  isOrganizer: () => boolean;
  isVenueOwner: () => boolean;
  isCasual: () => boolean;
};
