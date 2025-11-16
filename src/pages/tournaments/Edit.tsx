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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Edit Tournament</h1>
            <p className="text-gray-300 text-lg">Update your tournament details and settings</p>
          </div>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 shadow-2xl">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-white">Basic Information</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="name" className="text-white font-medium text-sm uppercase tracking-wide">
                        Tournament Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter tournament name"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="game" className="text-white font-medium text-sm uppercase tracking-wide">
                        Game
                      </Label>
                      <Input
                        id="game"
                        name="game"
                        value={formData.game}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter game name"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Date & Time Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-white">Schedule</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="date" className="text-white font-medium text-sm uppercase tracking-wide">
                        Date
                      </Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="time" className="text-white font-medium text-sm uppercase tracking-wide">
                        Time
                      </Label>
                      <Input
                        id="time"
                        name="time"
                        type="time"
                        value={formData.time}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Tournament Details Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-white">Tournament Details</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="max_participants" className="text-white font-medium text-sm uppercase tracking-wide">
                        Max Participants
                      </Label>
                      <Input
                        id="max_participants"
                        name="max_participants"
                        type="number"
                        value={formData.max_participants}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="100"
                        required
                        min={2}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="prize_pool" className="text-white font-medium text-sm uppercase tracking-wide">
                        Prize Pool
                      </Label>
                      <Input
                        id="prize_pool"
                        name="prize_pool"
                        value={formData.prize_pool}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="$1,000"
                        required
                      />
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="entry_fee" className="text-white font-medium text-sm uppercase tracking-wide">
                        Entry Fee
                      </Label>
                      <Input
                        id="entry_fee"
                        name="entry_fee"
                        value={formData.entry_fee}
                        onChange={handleInputChange}
                        className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Free"
                      />
                    </div>
                  </div>
                </div>

                {/* Venue Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-white">Location</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="venue" className="text-white font-medium text-sm uppercase tracking-wide">
                      Venue
                    </Label>
                    <Input
                      id="venue"
                      name="venue"
                      value={formData.venue}
                      onChange={handleInputChange}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 h-14 px-4 text-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Enter venue name or address"
                      required
                    />
                  </div>
                </div>

                {/* Description Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-pink-500 to-purple-500 rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-white">Description</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-white font-medium text-sm uppercase tracking-wide">
                      Tournament Description
                    </Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-[150px] p-4 text-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      placeholder="Describe your tournament, rules, format, and any special requirements..."
                      required
                    />
                  </div>
                </div>

                {/* Online Tournament Toggle */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                    <h2 className="text-2xl font-semibold text-white">Tournament Type</h2>
                  </div>
                  
                  <div className="flex items-center justify-between p-6 bg-slate-700/30 rounded-xl border border-slate-600/50">
                    <div className="space-y-1">
                      <Label htmlFor="is_online" className="text-white font-medium text-lg cursor-pointer">
                        Online Tournament
                      </Label>
                      <p className="text-slate-400 text-sm">
                        Toggle this if your tournament will be held online
                      </p>
                    </div>
                    <Switch
                      id="is_online"
                      checked={formData.is_online}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_online: checked }))}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-blue-500"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-700/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/organizer/tournament/${slug}`)}
                    className="flex-1 h-14 text-lg font-medium border-slate-600 text-white hover:bg-slate-700/50 hover:border-slate-500 transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-14 text-lg font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white transition-all shadow-lg hover:shadow-xl"
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving Changes...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
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