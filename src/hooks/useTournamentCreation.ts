import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import esportsGames from '@/data/esportsGames.json';
// @ts-expect-error slugify types not installed
import slugify from 'slugify';

interface FormData {
  name: string;
  game: string;
  structure: string;
  teamSize: string;
  date: string;
  time: string;
  venue: string;
  maxParticipants: string;
  prizePool: string;
  description: string;
  isOnline: boolean;
  entryFee: string;
}

export const useTournamentCreation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    game: '',
    structure: '',
    teamSize: '',
    date: '',
    time: '',
    venue: '',
    maxParticipants: '',
    prizePool: '',
    description: '',
    isOnline: false,
    entryFee: 'Free'
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => {
      const updates: Partial<FormData> = { [field]: value };
      
      // If game is changed, set both structure and teamSize to the game's default format
      if (field === 'game') {
        const game = esportsGames.games.find(g => g.name.toLowerCase() === value.toLowerCase());
        if (game) {
          const defaultFormat = game.formats.find(f => f.value === game.defaultFormat);
          if (defaultFormat) {
            updates.structure = defaultFormat.value;
            updates.teamSize = defaultFormat.teamSize.toString();
          }
        }
      }
      
      // If structure is changed, update teamSize to match
      if (field === 'structure') {
        const game = esportsGames.games.find(g => g.name.toLowerCase() === prev.game.toLowerCase());
        if (game) {
          const format = game.formats.find(f => f.value === value);
          if (format) {
            updates.teamSize = format.teamSize.toString();
          }
        }
      }
      
      return { ...prev, ...updates };
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateForm = (): boolean => {
    if (!formData.name || !formData.game || !formData.structure || !formData.teamSize || 
        !formData.date || !formData.time || (!formData.isOnline && !formData.venue) || !formData.maxParticipants || 
        !formData.prizePool || !formData.description) {
      setError("Please fill in all required fields");
      return false;
    }

    const maxParticipants = parseInt(formData.maxParticipants, 10);
    if (isNaN(maxParticipants) || maxParticipants < 2) {
      setError("Maximum participants must be at least 2");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be signed in to create a tournament.",
        variant: "destructive",
      });
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const slug = slugify(formData.name, { lower: true, strict: true });
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          game: formData.game,
          team_size: parseInt(formData.teamSize, 10),
          date: formData.date,
          time: formData.time,
          venue: formData.venue,
          max_participants: parseInt(formData.maxParticipants, 10),
          prize_pool: formData.prizePool,
          description: formData.description,
          status: 'upcoming',
          user_id: user.id,
          organizer_id: user.id,
          entry_fee: formData.entryFee,
          is_online: formData.isOnline,
          slug
        })
        .select()
        .single();
        
      if (tournamentError) throw tournamentError;

      toast({
        title: "Tournament Created",
        description: "Your tournament has been successfully created!",
      });
      
      navigate(`/tournaments/${slug}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the tournament');
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create tournament',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    error,
    loading,
    handleInputChange,
    handleSelectChange,
    handleCheckboxChange,
    handleSubmit
  };
};
