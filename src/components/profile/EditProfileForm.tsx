import { useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/avatar';

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('user-avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('user-avatars').getPublicUrl(fileName);
      const publicUrl = publicUrlData?.publicUrl;
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
      await onUpdateProfile(data);
      setOpen(false);
      form.reset(data);
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
          <Avatar src={previewUrl} name={form.watch('full_name') || form.watch('username')} size={72} />
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
