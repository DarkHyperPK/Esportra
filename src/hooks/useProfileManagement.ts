import { UserProfile } from '@/types/auth';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { normalizeProfileFromApi } from '@/utils/profileFields';

const ALLOWED_FIELDS = [
  'username', 'full_name', 'avatar_url', 'avatar_seed', 'avatar_style', 'bio',
  'riot_tag', 'steam_tag', 'phone', 'location',
  'social_links', 'card_image_url', 'country_code', 'date_of_birth',
] as const;

export const useProfileManagement = () => {
  const { toast } = useToast();

  const updateProfile = async (updates: Partial<UserProfile>, userId: string): Promise<UserProfile> => {
    // Filter to allowed fields
    const valid: Record<string, unknown> = {};
    const source = updates as Partial<Record<(typeof ALLOWED_FIELDS)[number], unknown>>;
    for (const key of ALLOWED_FIELDS) {
      if (source[key] !== undefined && source[key] !== null)
        valid[key] = source[key];
    }

    if (Object.keys(valid).length === 0) {
      toast({ title: 'No changes', description: 'No valid fields to update.', variant: 'destructive' });
      throw new Error('No valid fields to update.');
    }

    try {
      const updated = await apiClient.put<Record<string, unknown>>(`/api/profiles/${userId}`, valid);
      toast({ title: 'Profile updated', description: 'Your profile has been updated successfully.' });
      return normalizeProfileFromApi({ ...valid, ...updated }, userId);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as any;
        const msg  = body?.error ?? err.message;
        if (err.status === 409) {
          toast({ title: 'Username already taken', description: msg, variant: 'destructive' });
          throw new Error('Username already taken');
        }
        toast({ title: 'Error updating profile', description: msg, variant: 'destructive' });
      } else {
        toast({ title: 'Error updating profile', description: 'An unexpected error occurred.', variant: 'destructive' });
      }
      throw err;
    }
  };

  return { updateProfile };
};
