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
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import esportsGames from '@/data/esportsGames.json';

interface Tournament {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  prize_pool: string;
  description: string;
  image_url: string | null;
  entry_fee: string;
  is_online: boolean;
}

interface TournamentEditModalProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  onTournamentUpdated: () => void;
}

export function TournamentEditModal({ 
  tournament, 
  isOpen, 
  onClose, 
  onTournamentUpdated 
}: TournamentEditModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(tournament.image_url || '');
  const [uploading, setUploading] = useState(false);
  type VenueOption = { id: string; name: string };
  const [venues, setVenues] = useState<VenueOption[]>([]);
  
  const form = useForm({
    defaultValues: {
      name: tournament.name,
      game: tournament.game,
      date: tournament.date,
      time: tournament.time,
      venue: tournament.venue,
      max_participants: tournament.max_participants.toString(),
      prize_pool: tournament.prize_pool,
      description: tournament.description,
      entry_fee: tournament.entry_fee,
      is_online: tournament.is_online
    }
  });

  const fetchVenues = async () => {
    try {
      const { data, error } = await supabase.from('venues').select('id, name');
      
      if (error) {
        throw error;
      }
      
      setVenues((data as VenueOption[]) || []);
    } catch (error: unknown) {
      console.error('Error fetching venues:', error as Error);
    }
  };

  // Fetch venues when the modal is opened
  useState(() => {
    if (isOpen) {
      fetchVenues();
    }
  });

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${tournament.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `tournaments/${fileName}`;

      setUploading(true);

      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('tournaments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('tournaments')
        .getPublicUrl(filePath);

      setImageUrl(data.publicUrl);
      toast({
        title: 'Image uploaded',
        description: 'Your tournament image has been uploaded successfully',
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

  const onSubmit = async (data: Record<string, string | boolean>) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('tournaments')
        .update({
          name: data.name,
          game: data.game,
          date: data.date,
          time: data.time,
          venue: data.venue,
          max_participants: parseInt(data.max_participants),
          prize_pool: data.prize_pool,
          description: data.description,
          image_url: imageUrl || tournament.image_url,
          entry_fee: data.entry_fee,
          is_online: data.is_online
        })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: 'Tournament updated',
        description: 'Your tournament has been updated successfully',
      });
      onTournamentUpdated();
    } catch (error: unknown) {
      const e = error as { message?: string };
      console.error('Error updating tournament:', e);
      toast({
        title: 'Error updating tournament',
        description: e.message || 'Unknown error',
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
          <DialogTitle>Edit Tournament: {tournament.name}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="game"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gaming-dark border-gaming-gray/30">
                          <SelectValue placeholder="Select game" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {esportsGames.map((game) => (
                          <SelectItem key={game.name} value={game.name}>
                            <span className="flex items-center gap-2">
                              <img
                                src={game.logo}
                                alt={game.name + ' logo'}
                                className="w-6 h-6 object-contain rounded-sm bg-white border border-gray-200"
                                style={{ background: 'white' }}
                              />
                              <span>{game.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="md:col-span-1">
              <Label htmlFor="image">Tournament Banner Image</Label>
              <div className="mt-1 flex items-center space-x-4">
                <div className="w-20 h-20 bg-gaming-dark border border-gaming-gray/30 rounded overflow-hidden">
                  {imageUrl || tournament.image_url ? (
                    <img
                      src={imageUrl || tournament.image_url}
                      alt={tournament.name}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="date" 
                        className="bg-gaming-dark border-gaming-gray/30" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="time" 
                        className="bg-gaming-dark border-gaming-gray/30" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_online"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border border-gaming-gray/30 p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Online Tournament</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Is this tournament held online?
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      disabled={form.watch("is_online")}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gaming-dark border-gaming-gray/30">
                          <SelectValue placeholder="Select venue" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {venues.map((venue) => (
                          <SelectItem key={venue.id} value={venue.name}>
                            {venue.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Custom Venue">Custom Venue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Participants</FormLabel>
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
                name="prize_pool"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prize Pool</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-gaming-dark border-gaming-gray/30" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="entry_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Fee</FormLabel>
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
