import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tournament } from '@/hooks/useTournaments';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import slugify from 'slugify';

// Define the type for the raw data from Supabase
type RawTournamentData = {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  prize_pool: string;
  description: string;
  user_id: string;
  entry_fee: string | null;
  is_online: boolean;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
};

const EditTournament = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    game: '',
    date: '',
    time: '',
    venue: '',
    max_participants: 0,
    prize_pool: '',
    entry_fee: '',
    description: '',
    is_online: false
  });

  useEffect(() => {
    if (slug) {
      fetchTournament();
    }
  }, [slug]);

  const fetchTournament = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;

      // Convert raw data to Tournament type
      const tournamentData: Tournament = {
        ...(data as RawTournamentData),
        status: 'upcoming',
        current_participants: 0
      };

      setTournament(tournamentData);
      setFormData({
        name: data.name,
        game: data.game,
        date: data.date,
        time: data.time,
        venue: data.venue,
        max_participants: data.max_participants,
        prize_pool: data.prize_pool,
        entry_fee: data.entry_fee || '',
        description: data.description,
        is_online: data.is_online
      });
    } catch (error: any) {
      console.error('Error fetching tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tournament details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const newSlug = slugify(formData.name, { lower: true, strict: true });
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: formData.name,
          game: formData.game,
          date: formData.date,
          time: formData.time,
          venue: formData.venue,
          max_participants: formData.max_participants,
          prize_pool: formData.prize_pool,
          entry_fee: formData.entry_fee || null,
          description: formData.description,
          is_online: formData.is_online,
          slug: newSlug
        })
        .eq('slug', slug);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Tournament updated successfully',
      });
      navigate(`/organizer/tournament/${newSlug}`);
    } catch (error: any) {
      console.error('Error updating tournament:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tournament',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-gaming-gray/20 rounded"></div>
            <div className="h-64 bg-gaming-gray/20 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Tournament not found</h1>
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              Back to Tournaments
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Edit Tournament</h1>
          
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Tournament Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tournament Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="game">Game</Label>
                    <Input
                      id="game"
                      name="game"
                      value={formData.game}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      name="time"
                      type="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Maximum Participants</Label>
                    <Input
                      id="max_participants"
                      name="max_participants"
                      type="number"
                      value={formData.max_participants}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      required
                      min={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prize_pool">Prize Pool</Label>
                    <Input
                      id="prize_pool"
                      name="prize_pool"
                      value={formData.prize_pool}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry_fee">Entry Fee (optional)</Label>
                    <Input
                      id="entry_fee"
                      name="entry_fee"
                      value={formData.entry_fee}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      placeholder="Free"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input
                      id="venue"
                      name="venue"
                      value={formData.venue}
                      onChange={handleInputChange}
                      className="bg-gaming-gray/10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="bg-gaming-gray/10 min-h-[100px]"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_online"
                    checked={formData.is_online}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_online: checked }))}
                  />
                  <Label htmlFor="is_online">Online Tournament</Label>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/organizer/tournament/${slug}`)}
                    className="border-gaming-gray/30"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gaming-purple hover:bg-gaming-purple/80"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditTournament; 