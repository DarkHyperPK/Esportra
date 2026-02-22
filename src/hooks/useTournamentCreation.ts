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
      // Parse dates and times
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(startDateTime.getTime() + (2 * 60 * 60 * 1000)); // 2 hours later
      const registrationDeadline = new Date(startDateTime.getTime() - (24 * 60 * 60 * 1000)); // 1 day before

      // Parse entry fee and prize pool, clamp to DB numeric(10,2) safe range
      const toMoney = (val: string, freeAsZero = false) => {
        if (freeAsZero && (val || '').trim().toLowerCase() === 'free') return 0;
        const num = parseFloat((val || '').toString().replace(/[^0-9.]/g, ''));
        if (!isFinite(num) || isNaN(num)) return 0;
        const clamped = Math.min(Math.max(0, num), 99999999.99);
        // Round to 2 decimals to satisfy scale 2
        return Math.round(clamped * 100) / 100;
      };

      const entryFee = toMoney(formData.entryFee, true);
      const prizePool = toMoney(formData.prizePool);

      // Map structure to format
      const formatMap: { [key: string]: string } = {
        'single_elimination': 'single_elimination',
        'double_elimination': 'double_elimination',
        'round_robin': 'round_robin',
        'swiss': 'swiss',
        'custom': 'custom'
      };

      // Build base slug and ensure uniqueness by appending a numeric suffix on conflict
      let slug = slugify(formData.name, { lower: true, strict: true });
      let uniqueSlug = slug;
      try {
        const { data: existing } = await supabase
          .from('tournaments')
          .select('id')
          .eq('slug', uniqueSlug)
          .limit(1);
        if (existing && existing.length > 0) {
          uniqueSlug = `${slug}-${Date.now().toString(36).slice(-4)}`;
        }
      } catch { }
      slug = uniqueSlug;


      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .insert({
          name: formData.name,
          description: formData.description,
          slug: slug,
          game: formData.game,
          format: formatMap[formData.structure] || 'single_elimination',
          max_teams: Math.max(2, Math.min(1024, parseInt(formData.maxParticipants, 10) || 2)),
          min_teams: 2,
          entry_fee: entryFee,
          prize_pool: prizePool,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          registration_deadline: registrationDeadline.toISOString(),
          status: 'open',
          banner_url: null,
          logo_url: null,
          // Use null unless you have a valid venue_id (UUID) to relate
          venue_id: formData.isOnline ? null : null,
          is_public: true,

        })
        .select()
        .single();

      if (tournamentError) {
        console.error('Create tournament insert error:', {
          code: (tournamentError as any).code,
          message: (tournamentError as any).message,
          details: (tournamentError as any).details,
          hint: (tournamentError as any).hint
        });
        throw tournamentError;
      }

      // Tournament created successfully


      toast({
        title: "Tournament Created",
        description: "Your tournament has been successfully created!",
      });

      const navigationPath = tournament?.slug ? `/organizer/tournament/${tournament.slug}` : `/organizer/tournament/${tournament.id}`;

      navigate(navigationPath);
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      const msg = err?.message || 'Failed to create tournament';
      setError(msg);
      toast({
        title: "Error",
        description: msg,
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
