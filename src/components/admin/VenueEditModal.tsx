
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';

interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string;
  stations: number;
  hours: string;
  games: string;
  contact_email: string;
  contact_phone: string;
  image_url: string | null;
  price_range?: string;
}

interface VenueEditModalProps {
  venue: Venue;
  isOpen: boolean;
  onClose: () => void;
  onVenueUpdated: () => void;
}

export function VenueEditModal({ venue, isOpen, onClose, onVenueUpdated }: VenueEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(venue.image_url || '');
  const [uploading, setUploading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: venue.name,
      city: venue.city,
      address: venue.address,
      description: venue.description,
      stations: venue.stations.toString(),
      hours: venue.hours,
      games: venue.games,
      contact_email: venue.contact_email,
      contact_phone: venue.contact_phone,
      price_range: venue.price_range || '$10-20/hr'
    }
  });

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${venue.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `venues/${fileName}`;

      setUploading(true);

      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('venues')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('venues')
        .getPublicUrl(filePath);

      setImageUrl(data.publicUrl);
      toast({
        title: 'Image uploaded',
        description: 'Your venue image has been uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error uploading image',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('venues')
        .update({
          name: data.name,
          city: data.city,
          address: data.address,
          description: data.description,
          stations: parseInt(data.stations),
          hours: data.hours,
          games: data.games,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          price_range: data.price_range,
          image_url: imageUrl || venue.image_url
        })
        .eq('id', venue.id);

      if (error) throw error;

      toast({
        title: 'Venue updated',
        description: 'Your venue has been updated successfully',
      });
      onVenueUpdated();
    } catch (error: any) {
      console.error('Error updating venue:', error);
      toast({
        title: 'Error updating venue',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-esports-dark text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Venue: {venue.name}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-1">
                <Label htmlFor="image">Venue Image</Label>
                <div className="mt-1 flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gaming-dark border border-gaming-gray/30 rounded overflow-hidden">
                    {imageUrl || venue.image_url ? (
                      <img
                        src={imageUrl || venue.image_url}
                        alt={venue.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleUploadImage}
                      disabled={uploading}
                      className="cursor-pointer"
                    />
                    {uploading && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      className="h-32 bg-gaming-dark border-gaming-gray/30" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Gaming Stations</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        className="bg-gaming-dark border-gaming-gray/30" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operating Hours</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="games"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Games</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="email" 
                        className="bg-gaming-dark border-gaming-gray/30" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="price_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Range</FormLabel>
                  <FormControl>
                    <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-gaming-gray/30"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-gaming-purple hover:bg-gaming-purple/80"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
