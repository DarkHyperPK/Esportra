import React, { useEffect, useState } from 'react';
import { Loader2, Trophy, Workflow, Check } from 'lucide-react';
import { useCreateSeason } from '@/hooks/useSeasons';
import type { CreateSeasonRequest, SeasonWizardData } from '@/types/season';
import { useNavigate, Link } from 'react-router-dom';
import esportsGames from '@/data/esportsGames.json';
import { apiClient } from '@/lib/apiClient';

const SeasonWizard: React.FC = () => {
  const [data, setData] = useState<SeasonWizardData>({
    name: '',
    game: '',
    description: '',
    start_date: undefined,
    end_date: undefined,
    banner_url: undefined,
    logo_url: undefined,
    organization_id: undefined,
    tournaments: [],
    point_rules: [],
    advancement_rules: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdSeason, setCreatedSeason] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate: createSeason } = useCreateSeason();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const loadOrganization = async () => {
      try {
        const roles = await apiClient.get<{ organization_id?: string | null }>('/api/me/roles');
        if (mounted && roles?.organization_id) {
          setData(prev => ({ ...prev, organization_id: roles.organization_id ?? undefined }));
        }
      } catch {
        // silently fail
      }
    };
    void loadOrganization();
    return () => { mounted = false; };
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = 'REQUIRED';
    else if (data.name.trim().length < 3) newErrors.name = 'MINIMUM 3 CHARACTERS';
    if (!data.game.trim()) newErrors.game = 'REQUIRED';
    if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
      newErrors.dates = 'END DATE MUST BE AFTER START DATE';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const updateData = (updates: Partial<SeasonWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    const fields = Object.keys(updates);
    setErrors(prev => {
      const next = { ...prev };
      fields.forEach(f => delete next[f]);
      return next;
    });
  };

  const submitSeason = () => {
    if (!validate()) return;
    setIsSubmitting(true);

    const seasonData: CreateSeasonRequest = {
      name: data.name,
      game: data.game,
      description: data.description,
      start_date: data.start_date,
      end_date: data.end_date,
      banner_url: data.banner_url,
      logo_url: data.logo_url,
      organization_id: data.organization_id,
    };

    createSeason(seasonData, {
      onSuccess: (season) => {
        setIsSubmitting(false);
        setCreatedSeason(season);
      },
      onError: () => {
        setIsSubmitting(false);
      },
    });
  };

  const availableGames = esportsGames.games.filter(g => g.slug !== 'cs2');
  const canSubmit = data.name.trim().length >= 3 && data.game.trim().length > 0 && !isSubmitting;

  if (createdSeason) {
    return (
      <div className="max-w-2xl mx-auto pt-4">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <Check className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">SEASON CREATED</h2>
              <p className="text-xs text-[#a0a0a0] uppercase tracking-widest">STATUS: DRAFT</p>
            </div>
          </div>

          <h3 className="text-3xl font-bold text-white mb-1">{createdSeason.name}</h3>
          <p className="text-sm text-[#a0a0a0] font-mono">/season/{createdSeason.slug}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to={`/tournaments/create?mode=event&seasonId=${createdSeason.id}&game=${encodeURIComponent(data.game)}`}
            className="flex items-center justify-center gap-2 h-12 bg-transparent text-white border border-[#2a2a2a] text-xs font-semibold uppercase tracking-widest hover:bg-white/5 hover:border-[#404040] transition-none"
          >
            <Trophy className="w-4 h-4" />
            CREATE TOURNAMENT
          </Link>
          <Link
            to={`/organizer/season/${createdSeason.id}`}
            className="flex items-center justify-center gap-2 h-12 bg-transparent text-white border border-[#2a2a2a] text-xs font-semibold uppercase tracking-widest hover:bg-white/5 hover:border-[#404040] transition-none"
          >
            <Workflow className="w-4 h-4" />
            MANAGE SEASON
          </Link>
          <button
            onClick={() => navigate('/organizer/seasons')}
            className="flex items-center justify-center gap-2 h-12 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-[#e0e0e0] active:bg-[#cccccc] transition-none"
          >
            DONE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pt-4">
      {/* Section: Identity */}
      <div className="mb-12">
        <h2 className="text-[10px] font-bold text-[#808080] uppercase tracking-[0.25em] mb-8">
          IDENTITY
        </h2>

        {/* Season Name */}
        <div className="mb-8">
          <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-[0.2em] mb-3">
            SEASON NAME
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
            className={`w-full h-10 bg-transparent text-white text-base border-0 border-b ${
              errors.name ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
            } focus:border-white focus:outline-none placeholder-[#333] pb-2`}
            placeholder="Summer Championship 2026"
          />
          {errors.name ? (
            <p className="text-[#ef4444] text-[10px] uppercase tracking-wider mt-2">{errors.name}</p>
          ) : (
            <p className="text-[#333] text-[10px] uppercase tracking-wider mt-2">Required. 3–100 characters.</p>
          )}
        </div>

        {/* Game Selection — Tile Grid */}
        <div>
          <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-[0.2em] mb-4">
            GAME
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {availableGames.map((game) => {
              const selected = data.game === game.name;
              return (
                <button
                  key={game.name}
                  onClick={() => updateData({ game: game.name })}
                  className={`flex flex-col items-center justify-center gap-2 h-20 border ${
                    selected
                      ? 'border-white bg-white/5'
                      : errors.game
                        ? 'border-[#ef4444]/50'
                        : 'border-[#2a2a2a]'
                  } hover:border-[#404040] transition-none bg-transparent`}
                  title={game.name}
                >
                  <img
                    src={game.logo}
                    alt={game.name}
                    className="w-6 h-6 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                    selected ? 'text-white' : 'text-[#808080]'
                  }`}>
                    {game.name}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.game && (
            <p className="text-[#ef4444] text-[10px] uppercase tracking-wider mt-2">{errors.game}</p>
          )}
        </div>
      </div>

      {/* Section: Schedule */}
      <div className="mb-12">
        <h2 className="text-[10px] font-bold text-[#808080] uppercase tracking-[0.25em] mb-8">
          SCHEDULE
        </h2>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-[0.2em] mb-3">
              START
            </label>
            <input
              type="date"
              value={data.start_date || ''}
              onChange={(e) => updateData({ start_date: e.target.value || undefined })}
              className="w-full h-10 bg-transparent text-white text-sm border-0 border-b border-[#2a2a2a] focus:border-white focus:outline-none pb-2"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-[0.2em] mb-3">
              END
            </label>
            <input
              type="date"
              value={data.end_date || ''}
              onChange={(e) => updateData({ end_date: e.target.value || undefined })}
              className={`w-full h-10 bg-transparent text-white text-sm border-0 border-b ${
                errors.dates ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
              } focus:border-white focus:outline-none pb-2`}
            />
          </div>
        </div>
        {errors.dates && (
          <p className="text-[#ef4444] text-[10px] uppercase tracking-wider mt-3">{errors.dates}</p>
        )}
      </div>

      {/* Section: Details */}
      <div className="mb-12">
        <h2 className="text-[10px] font-bold text-[#808080] uppercase tracking-[0.25em] mb-8">
          DETAILS
        </h2>
        <div>
          <label className="block text-[10px] font-bold text-[#808080] uppercase tracking-[0.2em] mb-3">
            DESCRIPTION
          </label>
          <textarea
            value={data.description}
            onChange={(e) => updateData({ description: e.target.value })}
            rows={3}
            className="w-full bg-transparent text-white text-sm border-0 border-b border-[#2a2a2a] focus:border-white focus:outline-none placeholder-[#333] pb-2 resize-none"
            placeholder="Enter season description..."
          />
        </div>
      </div>

      {/* Action */}
      <div className="pt-4">
        <button
          onClick={submitSeason}
          disabled={!canSubmit}
          className={`w-full h-14 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] rounded-none transition-none ${
            canSubmit
              ? 'bg-white text-black hover:bg-[#e0e0e0] active:bg-[#cccccc]'
              : 'bg-transparent text-[#404040] border border-[#2a2a2a] cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              CREATING...
            </>
          ) : (
            'CREATE SEASON'
          )}
        </button>
      </div>
    </div>
  );
};

export default SeasonWizard;
