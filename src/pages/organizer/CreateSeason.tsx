import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trophy, Workflow, Calendar, Swords, Target, Crown, CalendarDays, Check, ArrowLeft } from 'lucide-react';
import { useCreateSeason } from '@/hooks/useSeasons';
import type { CreateSeasonRequest, SeasonWizardData } from '@/types/season';
import { apiClient } from '@/lib/apiClient';
import esportsGames from '@/data/esportsGames.json';
import { getTemplatesForGame, getTemplateById, generateSlotDates } from '@/data/seasonTemplates';

const ICON_MAP: Record<string, React.ElementType> = {
  Trophy, Workflow, Calendar, Swords, Target, Crown, CalendarDays,
};

const STEPS = [
  { id: 1, label: 'GAME' },
  { id: 2, label: 'TEMPLATE' },
  { id: 3, label: 'CUSTOMIZE' },
];

const CreateSeason: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: createSeason, isPending: isSubmitting } = useCreateSeason();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SeasonWizardData>({
    name: '',
    game: '',
    description: '',
    start_date: '',
    end_date: '',
    banner_url: undefined,
    logo_url: undefined,
    organization_id: undefined,
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdSeason, setCreatedSeason] = useState<{ id: string; name: string; slug: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadOrganization = async () => {
      try {
        const roles = await apiClient.get<{ organization_id?: string | null }>('/api/me/roles');
        if (mounted && roles?.organization_id) {
          setData(prev => ({ ...prev, organization_id: roles.organization_id ?? undefined }));
        }
      } catch { /* silently fail */ }
    };
    void loadOrganization();
    return () => { mounted = false; };
  }, []);

  const updateData = (updates: Partial<SeasonWizardData>) => {
    setData(prev => ({ ...prev, ...updates }));
    const fields = Object.keys(updates);
    setErrors(prev => {
      const next = { ...prev };
      fields.forEach(f => delete next[f]);
      return next;
    });
  };

  const availableGames = esportsGames.games.filter(g => g.slug !== 'cs2');
  const templates = data.game ? getTemplatesForGame(data.game) : [];
  const selectedTemplate = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;

  const handleSelectGame = (gameName: string) => {
    updateData({ game: gameName, name: '' });
    setSelectedTemplateId(null);
    setStep(2);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = getTemplateById(templateId);
    setSelectedTemplateId(templateId);
    if (template && data.start_date) {
      const slots = generateSlotDates(template, data.start_date);
      const lastSlot = slots[slots.length - 1];
      updateData({ end_date: lastSlot?.suggestedDate ?? data.end_date });
    }
    setStep(3);
  };

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

  const handleSubmit = () => {
    if (!validate()) return;

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
        setCreatedSeason(season);
      },
    });
  };

  const canSubmit = data.name.trim().length >= 3 && data.game.trim().length > 0 && !isSubmitting;

  // ── STEP INDICATOR ──
  const StepIndicator = () => (
    <div className="flex items-center gap-4 mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 flex items-center justify-center text-[10px] font-bold ${
              step >= s.id ? 'bg-white text-black' : 'bg-[#2a2a2a] text-[#808080]'
            }`}>
              {step > s.id ? <Check className="w-3 h-3" /> : s.id}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${
              step >= s.id ? 'text-white' : 'text-[#808080]'
            }`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-[1px] ${step > s.id ? 'bg-white' : 'bg-[#2a2a2a]'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  // ── SUCCESS STATE ──
  if (createdSeason) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-[#111111] border border-[#2a2a2a] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-white flex items-center justify-center">
              <Check className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">SEASON CREATED</h2>
              <p className="text-xs text-[#a0a0a0] uppercase tracking-widest">STATUS: DRAFT</p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-1">{createdSeason.name}</h3>
            <p className="text-sm text-[#a0a0a0] font-mono">/season/{createdSeason.slug}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate(`/organizer/season/${createdSeason.id}`)}
              className="flex items-center justify-center gap-2 h-11 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-[#e0e0e0] active:bg-[#cccccc] transition-none"
            >
              <Workflow className="w-4 h-4" />
              MANAGE SEASON
            </button>
            <button
              onClick={() => navigate('/organizer/seasons')}
              className="flex items-center justify-center gap-2 h-11 bg-transparent text-white border border-[#2a2a2a] text-xs font-semibold uppercase tracking-widest hover:bg-white/5 hover:border-[#404040] transition-none"
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 1: GAME ──
  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto">
        <StepIndicator />
        <h2 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2 mb-6">
          SELECT GAME
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {availableGames.map((game) => {
            const selected = data.game === game.name;
            return (
              <button
                key={game.name}
                onClick={() => handleSelectGame(game.name)}
                className={`flex flex-col items-center justify-center gap-2 h-24 border transition-none ${
                  selected
                    ? 'border-white bg-white/5'
                    : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#404040]'
                }`}
                title={game.name}
              >
                <img
                  src={game.logo}
                  alt={game.name}
                  className="w-8 h-8 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                  selected ? 'text-white' : 'text-[#a0a0a0]'
                }`}>
                  {game.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── STEP 2: TEMPLATE ──
  if (step === 2) {
    return (
      <div className="max-w-4xl mx-auto">
        <StepIndicator />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2">
            SELECT TEMPLATE
          </h2>
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1 text-[10px] text-[#a0a0a0] uppercase tracking-widest hover:text-white"
          >
            <ArrowLeft className="w-3 h-3" />
            BACK
          </button>
        </div>

        <p className="text-xs text-[#a0a0a0] mb-4 uppercase tracking-wider">
          SUGGESTED FOR {data.game}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {templates.map((template) => {
            const Icon = ICON_MAP[template.icon] || Trophy;
            const isSelected = selectedTemplateId === template.id;
            return (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template.id)}
                className={`text-left bg-[#111111] border p-6 transition-none ${
                  isSelected ? 'border-white bg-white/5' : 'border-[#2a2a2a] hover:border-[#404040]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <Icon className="w-8 h-8 text-white flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">{template.name}</h3>
                    <p className="text-xs text-[#a0a0a0] mt-1 leading-relaxed">{template.description}</p>
                    <div className="flex gap-1 mt-3">
                      {template.gameTags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase text-[#808080] border border-[#2a2a2a] px-2 py-0.5">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mini timeline */}
                <div className="flex items-center gap-2 mt-4">
                  {template.slots.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 ${
                        i === template.slots.length - 1 ? 'bg-white' : 'bg-[#2a2a2a]'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[#808080] uppercase tracking-wider mt-2">
                  {template.tournamentCount} tournaments • {template.slots[template.slots.length - 1]?.type === 'finals' ? 'cumulative points' : 'placement points'}
                </p>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setStep(3)}
          className="w-full h-12 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.15em] border border-[#2a2a2a] text-[#808080] hover:text-white hover:border-[#404040] transition-none"
        >
          START FROM SCRATCH
        </button>
      </div>
    );
  }

  // ── STEP 3: CUSTOMIZE ──
  const slotDates = selectedTemplate && data.start_date
    ? generateSlotDates(selectedTemplate, data.start_date)
    : [];

  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicator />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2">
          CUSTOMIZE
        </h2>
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-1 text-[10px] text-[#a0a0a0] uppercase tracking-widest hover:text-white"
        >
          <ArrowLeft className="w-3 h-3" />
          BACK
        </button>
      </div>

      <div className="bg-[#111111] border border-[#2a2a2a] p-8">
        {/* Identity */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2 mb-6">
            IDENTITY
          </h3>

          <div className="mb-6">
            <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
              SEASON NAME *
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => updateData({ name: e.target.value })}
              className={`w-full h-12 px-4 bg-[#0a0a0a] text-white text-sm border ${
                errors.name ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
              } focus:border-white focus:outline-none placeholder-[#404040] rounded-none`}
              placeholder="SUMMER CHAMPIONSHIP 2026"
            />
            {errors.name ? (
              <p className="text-[#ef4444] text-xs uppercase tracking-wider mt-1">{errors.name}</p>
            ) : (
              <p className="text-[#404040] text-xs uppercase tracking-wider mt-1">REQUIRED. 3–100 CHARACTERS.</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
              GAME
            </label>
            <div className="h-12 px-4 bg-[#0a0a0a] border border-[#2a2a2a] flex items-center text-white text-sm">
              {data.game}
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2 mb-6">
            SCHEDULE
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
                START *
              </label>
              <input
                type="date"
                value={data.start_date || ''}
                onChange={(e) => {
                  const date = e.target.value;
                  updateData({ start_date: date });
                  if (selectedTemplate && date) {
                    const slots = generateSlotDates(selectedTemplate, date);
                    const lastSlot = slots[slots.length - 1];
                    if (lastSlot) updateData({ end_date: lastSlot.suggestedDate });
                  }
                }}
                className={`w-full h-12 px-4 bg-[#0a0a0a] text-white text-sm border ${
                  errors.dates ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
                } focus:border-white focus:outline-none rounded-none`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
                END
              </label>
              <input
                type="date"
                value={data.end_date || ''}
                onChange={(e) => updateData({ end_date: e.target.value || undefined })}
                className={`w-full h-12 px-4 bg-[#0a0a0a] text-white text-sm border ${
                  errors.dates ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
                } focus:border-white focus:outline-none rounded-none`}
              />
            </div>
          </div>
          {errors.dates && (
            <p className="text-[#ef4444] text-xs uppercase tracking-wider mt-2">{errors.dates}</p>
          )}
        </div>

        {/* Tournament Slots (from template) */}
        {selectedTemplate && slotDates.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2 mb-6">
              TOURNAMENT SLOTS
            </h3>
            <div className="space-y-2">
              {slotDates.map((slot, i) => (
                <div key={i} className="flex items-center justify-between h-10 px-4 bg-[#0a0a0a] border border-[#2a2a2a]">
                  <span className="text-sm text-white">{slot.name}</span>
                  <span className="text-xs text-[#808080] font-mono">{slot.suggestedDate}</span>
                </div>
              ))}
            </div>
            <p className="text-[#404040] text-xs uppercase tracking-wider mt-2">
              SLOTS CREATED FROM {selectedTemplate.name.toUpperCase()} TEMPLATE
            </p>
          </div>
        )}

        {/* Point Rules */}
        {selectedTemplate && (
          <div className="mb-8">
            <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2 mb-6">
              POINT RULES
            </h3>
            <div className="border border-[#2a2a2a]">
              <div className="grid grid-cols-3 gap-0 border-b border-[#2a2a2a] bg-[#0a0a0a]">
                <div className="px-4 py-2 text-[10px] font-bold text-[#808080] uppercase tracking-wider">PLACEMENT</div>
                <div className="px-4 py-2 text-[10px] font-bold text-[#808080] uppercase tracking-wider">POINTS</div>
                <div className="px-4 py-2 text-[10px] font-bold text-[#808080] uppercase tracking-wider">STATUS</div>
              </div>
              {selectedTemplate.pointRules.map((rule, i) => (
                <div key={i} className="grid grid-cols-3 gap-0 border-b border-[#2a2a2a] last:border-b-0">
                  <div className="px-4 py-3 text-sm text-white font-mono">
                    {rule.placement_start === rule.placement_end
                      ? `${rule.placement_start}${getOrdinal(rule.placement_start)}`
                      : `${rule.placement_start}${getOrdinal(rule.placement_start)} – ${rule.placement_end}${getOrdinal(rule.placement_end)}`}
                  </div>
                  <div className="px-4 py-3 text-sm text-white font-mono">{rule.points}</div>
                  <div className="px-4 py-3 text-sm text-[#a0a0a0]">
                    {rule.qualification_status ? rule.qualification_status.toUpperCase() : '—'}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[#404040] text-xs uppercase tracking-wider mt-2">
              PRE-FILLED FROM TEMPLATE. EDIT AFTER CREATION IN POINT RULES TAB.
            </p>
          </div>
        )}

        {/* Details */}
        <div className="mb-8">
          <h3 className="text-xs font-bold text-[#a0a0a0] uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-2 mb-6">
            DETAILS
          </h3>
          <div>
            <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
              DESCRIPTION (OPTIONAL)
            </label>
            <textarea
              value={data.description}
              onChange={(e) => updateData({ description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-[#0a0a0a] text-white text-sm border border-[#2a2a2a] focus:border-white focus:outline-none placeholder-[#404040] rounded-none resize-none"
              placeholder="ENTER SEASON DESCRIPTION..."
            />
          </div>
        </div>

        {/* Action */}
        <div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full h-12 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.15em] rounded-none transition-none ${
              canSubmit
                ? 'bg-white text-black hover:bg-[#e0e0e0] active:bg-[#cccccc]'
                : 'bg-[#2a2a2a] text-[#404040] cursor-not-allowed'
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
          {!canSubmit && !isSubmitting && (
            <p className="text-[#404040] text-xs uppercase tracking-wider text-center mt-2">
              FILL REQUIRED FIELDS TO ENABLE
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

function getOrdinal(n: number): string {
  const s = ['TH', 'ST', 'ND', 'RD'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default CreateSeason;
