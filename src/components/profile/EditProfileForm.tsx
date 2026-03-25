import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { UserProfile } from '@/types/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface EditProfileFormProps {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  loading: boolean;
}

interface ProfileFormData {
  username: string;
  full_name: string;
  avatar_url?: string;
}

export const EditProfileForm = ({ profile, onUpdateProfile, loading }: EditProfileFormProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatar_url || null);
  const form = useForm<ProfileFormData>({
    defaultValues: {
      username: profile.username || '',
      full_name: profile.full_name || '',
      avatar_url: profile.avatar_url || '',
    },
  });

  // Update preview when profile changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setPreviewUrl(profile.avatar_url || null);
      form.reset({
        username: profile.username || '',
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, open]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    setPreviewUrl(URL.createObjectURL(file));

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'users.avatars');
      fd.append('path', fileName);
      const { url: publicUrl } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
      if (publicUrl) {
        setPreviewUrl(publicUrl);
        form.setValue('avatar_url', publicUrl);
      }
    } catch (err) {
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      // Only include fields that have actually changed
      const updates: Partial<UserProfile> = {};
      
      if (data.username !== profile.username) {
        updates.username = data.username;
      }
      
      if (data.full_name !== (profile.full_name || '')) {
        updates.full_name = data.full_name || null;
      }
      
      // Only include avatar_url if it's different and not empty
      if (data.avatar_url && data.avatar_url !== (profile.avatar_url || '')) {
        updates.avatar_url = data.avatar_url;
      }
      
      // Only update if there are actual changes
      if (Object.keys(updates).length > 0) {
        await onUpdateProfile(updates);
        setOpen(false);
        form.reset(data);
      } else {
        // No changes, just close the dialog
        setOpen(false);
      }
    } catch (error) {
      // Error handling is managed by the parent component
      console.error('Profile update failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default"
          className="bg-gaming-blue hover:bg-gaming-blue/80 flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-gray-900 text-white border border-gray-800 rounded-xl shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 mb-6">
          <Avatar className="w-[72px] h-[72px]">
            <AvatarImage src={previewUrl || undefined} alt={form.watch('full_name') || form.watch('username') || 'Profile'} />
            <AvatarFallback className="text-2xl bg-gray-700 text-white">
              {(form.watch('full_name') || form.watch('username') || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <label className="text-sm font-medium text-blue-400 hover:text-blue-300 cursor-pointer">
            <input type="file" accept="image/*" className="sr-only" onChange={handleFileChange} disabled={uploading} />
            {uploading ? 'Uploading...' : 'Change Profile Picture'}
          </label>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-gray-300">Username</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter username"
                      className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-gray-300">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter full name"
                      className="bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <input type="hidden" {...form.register('avatar_url')} />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-500"
                disabled={loading || uploading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
