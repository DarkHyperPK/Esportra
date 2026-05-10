import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Trophy, Workflow, Calendar, Swords, Target, Crown, CalendarDays, Check, X } from 'lucide-react';
import { useCreateSeason } from '@/hooks/useSeasons';
import type { CreateSeasonRequest, SeasonWizardData } from '@/types/season';
import { apiClient } from '@/lib/apiClient';
import esportsGames from '@/data/esportsGames.json';
import { getTemplatesForGame, getTemplateById, generateSlotDates } from '@/data/seasonTemplates';

const ICON_MAP: Record<string, React.ElementType> = {
  Trophy, Workflow, Calendar, Swords, Target, Crown, CalendarDays,
};

const CreateSeason: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: createSeason, isPending: isSubmitting } = useCreateSeason();
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

  const gameSectionRef = useRef<HTMLDivElement>(null);
  const templateSectionRef = useRef<HTMLDivElement>(null);
  const customizeSectionRef = useRef<HTMLDivElement>(null);

  // Reset state when component mounts (prevents stale success screen on back-nav)
  useEffect(() => {
    setCreatedSeason(null);
    setSelectedTemplateId(null);
    setErrors({});
    setData({
      name: '',
      game: '',
      description: '',
      start_date: '',
      end_date: '',
      banner_url: undefined,
      logo_url: undefined,
      organization_id: undefined,
    });
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
    // Auto-scroll to template section after a brief delay for render
    setTimeout(() => {
      templateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = getTemplateById(templateId);
    setSelectedTemplateId(templateId);
    if (template && data.start_date) {
      const slots = generateSlotDates(template, data.start_date);
      const lastSlot = slots[slots.length - 1];
      updateData({ end_date: lastSlot?.suggestedDate ?? data.end_date });
    }
    // Auto-scroll to customize section
    setTimeout(() => {
      customizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleStartFromScratch = () => {
    setSelectedTemplateId('custom');
    setTimeout(() => {
      customizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
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
  const slotDates = selectedTemplate && selectedTemplateId !== 'custom' && data.start_date
    ? generateSlotDates(selectedTemplate, data.start_date)
    : [];

  if (createdSeason) {
    return (
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="w-full max-w-lg">
          <div className="bg-[#111111] border border-[#2a2a2a] p-10 text-center">
            <div className="w-16 h-16 bg-white flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-black" />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wider mb-2">SEASON CREATED</h2>
            <p className="text-xs text-[#808080] uppercase tracking-widest mb-8">STATUS: DRAFT</p>

            <h3 className="text-3xl font-bold text-white mb-2">{createdSeason.name}</h3>
            <p className="text-sm text-[#808080] font-mono mb-10">/season/{createdSeason.slug}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => navigate(`/organizer/season/${createdSeason.id}`)}
                className="flex items-center justify-center gap-2 h-12 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-[#e0e0e0] active:bg-[#cccccc] transition-none"
              >
                <Workflow className="w-4 h-4" />
                MANAGE SEASON
              </button>
              <button
                onClick={() => navigate('/organizer/dashboard')}
                className="flex items-center justify-center gap-2 h-12 bg-transparent text-white border border-[#2a2a2a] text-xs font-semibold uppercase tracking-widest hover:bg-white/5 hover:border-[#404040] transition-none"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-sm border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/organizer/dashboard')} className="text-white font-bold text-lg tracking-wider uppercase hover:opacity-80 transition-opacity">
            ESPORT<span className="text-rose-500">RA</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-[#555555] uppercase tracking-widest hidden sm:block">CREATE SEASON</span>
            <button
              onClick={() => navigate('/organizer/dashboard')}
              className="flex items-center justify-center w-8 h-8 border border-[#2a2a2a] text-[#808080] hover:text-white hover:border-[#404040] transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-20">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-[2px] bg-rose-500" />
              <span className="text-rose-400 text-[10px] font-bold tracking-[0.25em] uppercase">NEW SEASON</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-[0.95] mb-4">CREATE SEASON</h1>
            <p className="text-[#808080] text-sm max-w-xl">Build a competitive season with multiple tournaments, point rules, and advancement logic.</p>
          </div>

          <section ref={gameSectionRef}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">// STEP 01</span>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-6">SELECT GAME</h2>
            <p className="text-sm text-[#808080] mb-6">Choose the esport that your season will feature</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {availableGames.map((game) => {
                const selected = data.game === game.name;
                return (
                  <button
                    key={game.name}
                    onClick={() => handleSelectGame(game.name)}
                    className={`group relative flex flex-col items-center justify-center gap-4 p-8 border-2 transition-all duration-200 ${
                      selected
                        ? 'border-rose-500 bg-rose-500/5'
                        : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#404040] hover:bg-[#111111]'
                    }`}
                  >
                    <img
                      src={game.logo}
                      alt={game.name}
                      className={`w-16 h-16 object-contain transition-transform duration-200 ${
                        selected ? 'scale-110' : 'group-hover:scale-105'
                      }`}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="text-center">
                      <span className={`text-sm font-bold uppercase tracking-wider block ${
                        selected ? 'text-white' : 'text-[#a0a0a0] group-hover:text-white'
                      }`}>
                        {game.name}
                      </span>
                      <span className="text-[11px] text-[#555555] mt-1 block">{game.category}</span>
                    </div>
                    {selected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-rose-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-black" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {data.game && (
            <section ref={templateSectionRef}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">// STEP 02</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-6">CHOOSE TEMPLATE</h2>
              <p className="text-sm text-[#808080] mb-6">Pre-built structures for {data.game} seasons</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {templates.map((template) => {
                  const Icon = ICON_MAP[template.icon] || Trophy;
                  const isSelected = selectedTemplateId === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      className={`text-left p-8 border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/5'
                          : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333333] hover:bg-[#111111]'
                      }`}
                    >
                      <div className="flex items-start gap-5">
                        <div className={`w-12 h-12 flex items-center justify-center flex-shrink-0 border ${
                          isSelected ? 'border-rose-500 bg-rose-500/10' : 'border-[#2a2a2a] bg-[#111111]'
                        }`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-bold text-white uppercase tracking-wider">{template.name}</h3>
                            {isSelected && (
                              <div className="w-5 h-5 bg-rose-500 flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-black" />
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-[#808080] leading-relaxed mb-4">{template.description}</p>
                          <div className="flex flex-wrap gap-2 mb-5">
                            {template.gameTags.map(tag => (
                              <span key={tag} className="text-[11px] font-semibold uppercase text-[#808080] border border-[#2a2a2a] px-3 py-1">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              {template.slots.map((_slot, i) => (
                                <React.Fragment key={i}>
                                  <div className={`w-2.5 h-2.5 ${
                                    i === template.slots.length - 1 ? 'bg-rose-500' : 'bg-[#2a2a2a]'
                                  }`} />
                                  {i < template.slots.length - 1 && (
                                    <div className="w-4 h-[1px] bg-[#2a2a2a]" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                            <span className="text-[11px] text-[#555555] uppercase tracking-wider">
                              {template.tournamentCount} tournaments
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleStartFromScratch}
                className={`w-full h-14 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.15em] border-2 border-dashed transition-all duration-200 ${
                  selectedTemplateId === 'custom'
                    ? 'border-rose-500 text-white bg-rose-500/5'
                    : 'border-[#2a2a2a] text-[#555555] hover:text-white hover:border-[#404040]'
                }`}
              >
                {selectedTemplateId === 'custom' && <Check className="w-4 h-4" />}
                START FROM SCRATCH — NO TEMPLATE
              </button>
            </section>
          )}

          {selectedTemplateId && (
            <section ref={customizeSectionRef}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold text-[#555555] uppercase tracking-[0.2em]">// STEP 03</span>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight mb-6">CUSTOMIZE</h2>
              <p className="text-sm text-[#808080] mb-6">Set the details for your {data.game} season</p>

              <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-10">
                <div className="mb-10">
                  <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-3 mb-6">
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
                      className={`w-full h-14 px-5 bg-[#050505] text-white text-base border-2 ${
                        errors.name ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
                      } focus:border-white focus:outline-none placeholder-[#333333] transition-colors`}
                      placeholder="Summer Championship 2026"
                    />
                    {errors.name ? (
                      <p className="text-[#ef4444] text-xs uppercase tracking-wider mt-2">{errors.name}</p>
                    ) : (
                      <p className="text-[#404040] text-xs uppercase tracking-wider mt-2">Required. 3–100 characters.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
                      GAME
                    </label>
                    <div className="h-14 px-5 bg-[#050505] border border-[#2a2a2a] flex items-center gap-3">
                      {data.game && (
                        <img
                          src={availableGames.find(g => g.name === data.game)?.logo}
                          alt=""
                          className="w-6 h-6 object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span className="text-white text-sm font-medium">{data.game}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-10">
                  <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-3 mb-6">
                    SCHEDULE
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
                        START DATE *
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
                        className={`w-full h-14 px-5 bg-[#050505] text-white text-sm border-2 ${
                          errors.dates ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
                        } focus:border-white focus:outline-none transition-colors`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#a0a0a0] uppercase tracking-widest mb-2">
                        END DATE
                      </label>
                      <input
                        type="date"
                        value={data.end_date || ''}
                        onChange={(e) => updateData({ end_date: e.target.value || undefined })}
                        className={`w-full h-14 px-5 bg-[#050505] text-white text-sm border-2 ${
                          errors.dates ? 'border-[#ef4444]' : 'border-[#2a2a2a]'
                        } focus:border-white focus:outline-none transition-colors`}
                      />
                    </div>
                  </div>
                  {errors.dates && (
                    <p className="text-[#ef4444] text-xs uppercase tracking-wider mt-2">{errors.dates}</p>
                  )}
                </div>

                {selectedTemplate && selectedTemplateId !== 'custom' && slotDates.length > 0 && (
                  <div className="mb-10">
                    <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-3 mb-6">
                      TOURNAMENT SLOTS
                    </h3>
                    <div className="space-y-2">
                      {slotDates.map((slot, i) => (
                        <div key={i} className="flex items-center justify-between h-12 px-5 bg-[#050505] border border-[#2a2a2a]">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 bg-[#1a1a1a] flex items-center justify-center text-[10px] font-bold text-[#808080]">{i + 1}</span>
                            <span className="text-sm text-white font-medium">{slot.name}</span>
                          </div>
                          <span className="text-xs text-[#808080] font-mono">{slot.suggestedDate}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[#404040] text-xs uppercase tracking-wider mt-3">
                      Generated from {selectedTemplate.name} template
                    </p>
                  </div>
                )}

                {selectedTemplate && selectedTemplateId !== 'custom' && (
                  <div className="mb-10">
                    <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-3 mb-6">
                      POINT RULES
                    </h3>
                    <div className="border border-[#2a2a2a]">
                      <div className="grid grid-cols-3 gap-0 border-b border-[#2a2a2a] bg-[#050505]">
                        <div className="px-5 py-3 text-[11px] font-bold text-[#808080] uppercase tracking-wider">PLACEMENT</div>
                        <div className="px-5 py-3 text-[11px] font-bold text-[#808080] uppercase tracking-wider">POINTS</div>
                        <div className="px-5 py-3 text-[11px] font-bold text-[#808080] uppercase tracking-wider">STATUS</div>
                      </div>
                      {selectedTemplate.pointRules.map((rule, i) => (
                        <div key={i} className="grid grid-cols-3 gap-0 border-b border-[#2a2a2a] last:border-b-0">
                          <div className="px-5 py-4 text-sm text-white font-mono">
                            {rule.placement_start === rule.placement_end
                              ? `${rule.placement_start}${getOrdinal(rule.placement_start)}`
                              : `${rule.placement_start}${getOrdinal(rule.placement_start)} – ${rule.placement_end}${getOrdinal(rule.placement_end)}`}
                          </div>
                          <div className="px-5 py-4 text-sm text-white font-mono">{rule.points}</div>
                          <div className="px-5 py-4 text-sm text-[#a0a0a0]">
                            {rule.qualification_status ? rule.qualification_status.toUpperCase() : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[#404040] text-xs uppercase tracking-wider mt-3">
                      Pre-filled from template. Edit after creation in Point Rules tab.
                    </p>
                  </div>
                )}

                <div className="mb-10">
                  <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-b border-[#2a2a2a] pb-3 mb-6">
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
                      className="w-full px-5 py-4 bg-[#050505] text-white text-sm border-2 border-[#2a2a2a] focus:border-white focus:outline-none placeholder-[#333333] resize-none transition-colors"
                      placeholder="Describe the season format, prizes, or any special rules..."
                    />
                  </div>
                </div>

                <div>
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`w-full h-14 flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-[0.15em] transition-all duration-200 ${
                      canSubmit
                        ? 'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600'
                        : 'bg-[#1a1a1a] text-[#404040] cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        CREATING SEASON...
                      </>
                    ) : (
                      'CREATE SEASON'
                    )}
                  </button>
                  {!canSubmit && !isSubmitting && (
                    <p className="text-[#404040] text-xs uppercase tracking-wider text-center mt-3">
                      Fill the required fields above to create your season
                    </p>
                  )}
                </div>
              </div>
            </section>
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
