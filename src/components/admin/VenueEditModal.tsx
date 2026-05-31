
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiClient } from '@/lib/apiClient';
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
import ImageUploader from '@/components/tournament/wizard/ImageUploader';
import { X, Info } from 'lucide-react';

import { Venue } from '@/types/venue';

interface VenueEditModalProps {
  venue: Venue;
  isOpen: boolean;
  onClose: () => void;
  onVenueUpdated: () => void;
}

export function VenueEditModal({ venue, isOpen, onClose, onVenueUpdated }: VenueEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  // Initialize images from venue or empty array
  const [images, setImages] = useState<string[]>(venue.images || []);

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

  const handleAddImage = (url: string | null) => {
    if (url) {
      setImages(prev => [...prev, url]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);

      await apiClient.put(`/api/admin/venues/${venue.id}`, {
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
        images: images
      });

      toast({
        title: 'Venue updated',
        description: 'Your venue has been updated successfully',
      });
      onVenueUpdated();
      onClose(); // Close modal on success
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
      <DialogContent className="sm:max-w-4xl bg-[#0a0a0c] border border-white/10 text-white overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Venue: {venue.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 my-4">
          {/* Left Column: Form Fields */}
          <div className="space-y-4">
            <Form {...form}>
              <form id="venue-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-black/20 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-black/20 border-white/10" />
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
                          <Input {...field} className="bg-black/20 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stations</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" className="bg-black/20 border-white/10" />
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
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-black/20 border-white/10" />
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
                        <Textarea {...field} className="h-24 bg-black/20 border-white/10 resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="games"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Games</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-black/20 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </div>

          {/* Right Column: Media Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-lg font-semibold">Media Gallery</Label>
              <span className="text-xs text-gray-400">{images.length} images</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative aspect-video group rounded-lg overflow-hidden border border-white/10">
                  <img src={img} loading="lazy" alt={`Venue ${idx}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-red-500/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {idx === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-xs py-1 text-white font-medium">
                      Cover Image
                    </div>
                  )}
                </div>
              ))}

              {/* Add New Image Button mimicking the uploader style or just the uploader itself */}
              <div className="col-span-2 mt-2">
                <Label className="text-sm text-gray-400 mb-2 block">Upload New Photo</Label>
                <ImageUploader
                  value={null}
                  onChange={handleAddImage}
                  folder="venue-images"
                  label=""
                  aspectRatio="banner"
                />
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/20 p-4 rounded-xl flex gap-3 items-start">
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-200">
                The first image will be used as your <strong>Cover Image</strong>.
                Upload high-quality landscape photos (16:9) for the best results.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 border-t border-white/5 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="venue-edit-form"
            className="bg-purple-600 hover:bg-purple-500 text-white"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
