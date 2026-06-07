/**
 * useTournamentCreation — Domain 4: Simple Tournament Create Form
 *
 * Migrated submit handler from Supabase direct insert to .NET API.
 * Backend handles slug uniqueness automatically (no client-side check needed).
 * Form state management is unchanged.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { fetchCurrentOrganizationId } from '@/lib/currentOrganization';
import { getGameByName, getDefaultGameMode } from '@/utils/gameFeatures';
import { useGameCatalog } from '@/hooks/useGameCatalog';

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
  useGameCatalog();
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
      if (field === 'game') {
        const game = getGameByName(value);
        if (game) {
          const defaultMode = getDefaultGameMode(game.name);
          if (defaultMode) {
            updates.structure = defaultMode.value;
            updates.teamSize = defaultMode.teamSize.toString();
          }
        }
      }
      if (field === 'structure') {
        const game = getGameByName(prev.game);
        if (game) {
          const modes = game.modes?.length ? game.modes : game.formats;
          const format = modes.find((candidate) => candidate.value === value);
          if (format) updates.teamSize = format.teamSize.toString();
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
      toast({ title: "Authentication Required", description: "You must be signed in to create a tournament.", variant: "destructive" });
      return;
    }
    if (!validateForm()) return;

    setLoading(true);
    try {
      const toMoney = (val: string, freeAsZero = false) => {
        if (freeAsZero && (val || '').trim().toLowerCase() === 'free') return 0;
        const num = parseFloat((val || '').replace(/[^0-9.]/g, ''));
        if (!isFinite(num) || isNaN(num)) return 0;
        return Math.round(Math.min(Math.max(0, num), 99999999.99) * 100) / 100;
      };

      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const organizationId = await fetchCurrentOrganizationId();

      const tournament = await apiClient.post<{ id: string; slug: string }>('/api/tournaments', {
        name:        formData.name,
        description: formData.description,
        game:        formData.game,
        format:      formData.structure || 'single_elimination',
        maxTeams:    Math.max(2, Math.min(1024, parseInt(formData.maxParticipants, 10) || 2)),
        teamSize:    parseInt(formData.teamSize, 10) || 1,
        entryFee:    toMoney(formData.entryFee, true),
        prizePool:   toMoney(formData.prizePool),
        startDate:   startDateTime.toISOString(),
        isPublic:    true,
        organizationId: organizationId ?? undefined,
      });

      toast({ title: "Tournament Created", description: "Your tournament has been successfully created!" });
      navigate(tournament?.slug ? `/organizer/tournament/${tournament.slug}` : `/organizer/tournament/${tournament.id}`);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to create tournament';
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
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
