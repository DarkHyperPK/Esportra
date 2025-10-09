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
      const { data, error } = await supabase.storage.from('profile-pictures').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
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
      <DialogContent className="sm:max-w-[425px] bg-esports-dark text-white">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center mb-4">
          <Avatar src={previewUrl} name={form.watch('full_name') || form.watch('username')} size={64} />
          <label className="mt-2 cursor-pointer text-gaming-purple hover:underline">
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
            {uploading ? 'Uploading...' : 'Change Profile Picture'}
          </label>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
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
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <input type="hidden" {...form.register('avatar_url')} />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="border-gaming-gray/30"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-gaming-blue hover:bg-gaming-blue/80"
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
