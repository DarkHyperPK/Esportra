import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Check, ChevronRight, Gamepad2, Settings, Target, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { seasonApi } from '@/services/api';
import { useCreateSeason } from '@/hooks/useSeasons';
import { useToast } from '@/hooks/use-toast';
import { buildSeasonTemplatePlan } from '@/components/season/builder/seasonTemplateHydration';
import { getTemplatesForGame, type SeasonTemplate } from '@/data/seasonTemplates';
import esportsGames from '@/data/esportsGames.json';
import type { CreateSeasonRequest, CreateSeasonResponse, SeasonParticipantMode } from '@/types/season';
import { useSeasonSmoothScroll } from './useSeasonSmoothScroll';

type SectionId = 'directive' | 'blueprint' | 'launch';

type Blueprint = {
  id: string;
  name: string;
  meta: string;
  description: string;
  icon: typeof Calendar;
};

type FormState = {
  name: string;
  game: string;
  gameMode: string;
  region: string;
  participantMode: SeasonParticipantMode;
  description: string;
  startDate: string;
  endDate: string;
  bannerUrl: string;
  logoUrl: string;
};

type CatalogMode = {
  modeKey: string;
  name: string;
  teamSize: number;
  participantMode: SeasonParticipantMode;
  modeGroup?: string | null;
  variantLabel?: string | null;
};

type CatalogGame = {
  slug: string;
  name: string;
  category?: string | null;
  defaultModeKey: string;
  modes: CatalogMode[];
};

const CUSTOM_BLUEPRINT: Blueprint = { id: 'custom', name: 'Custom Blueprint', meta: 'Start blank', description: 'Create the season shell and design the tournament graph manually.', icon: Settings };

const templateToBlueprint = (template: SeasonTemplate): Blueprint => ({
  id: template.id,
  name: template.name,
  meta: `${template.tournamentCount} tournament${template.tournamentCount === 1 ? '' : 's'}`,
  description: template.description,
  icon: template.gameTags.includes('br') ? Target : Trophy,
});

const getApiErrorBodyMessage = (body: unknown) => {
  if (!body) return null;
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && 'error' in body && typeof (body as { error?: unknown }).error === 'string') return (body as { error: string }).error;
  if (typeof body === 'object' && 'message' in body && typeof (body as { message?: unknown }).message === 'string') return (body as { message: string }).message;
  return null;
};

const logSeasonCreationError = (phase: string, error: unknown, context: Record<string, unknown>) => {
  if (error instanceof ApiError) {
    console.error('[SeasonCreate] API error', {
      phase,
      status: error.status,
      body: error.body,
      backendMessage: getApiErrorBodyMessage(error.body),
      ...context,
    });
    return;
  }
  console.error('[SeasonCreate] Unexpected error', { phase, error, ...context });
};

const INITIAL_FORM: FormState = {
  name: '',
  game: '',
  gameMode: '',
  region: '',
  participantMode: 'team',
  description: '',
  startDate: '',
  endDate: '',
  bannerUrl: '',
  logoUrl: '',
};

const SeasonWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { scrollTo } = useSeasonSmoothScroll();
  const createSeason = useCreateSeason();

  const directiveRef = useRef<HTMLDivElement>(null);
  const blueprintRef = useRef<HTMLDivElement>(null);
  const launchRef = useRef<HTMLDivElement>(null);

  const [activeSection, setActiveSection] = useState<SectionId>('directive');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdSeason, setCreatedSeason] = useState<CreateSeasonResponse | null>(null);
  const [catalogGames, setCatalogGames] = useState<CatalogGame[]>([]);

  const gameOptions = useMemo<CatalogGame[]>(() => {
    if (catalogGames.length > 0) return catalogGames;
    return esportsGames.games.map((game) => ({
      slug: game.slug,
      name: game.name,
      category: game.category,
      defaultModeKey: game.formats?.[0]?.value ?? 'default',
      modes: (game.formats ?? []).map((format) => ({
        modeKey: format.value,
        name: format.name ?? format.value,
        teamSize: format.teamSize,
        participantMode: 'team' as SeasonParticipantMode,
      })),
    }));
  }, [catalogGames]);
  const selectedGame = useMemo(() => gameOptions.find((game) => game.name === form.game), [form.game, gameOptions]);
  const selectedMode = useMemo(() => selectedGame?.modes.find((mode) => mode.modeKey === form.gameMode) ?? selectedGame?.modes[0], [selectedGame, form.gameMode]);
  const blueprints = useMemo<Blueprint[]>(() => {
    if (!form.game) return [CUSTOM_BLUEPRINT];
    const gameTemplates = getTemplatesForGame(form.game).map(templateToBlueprint);
    return gameTemplates.some((template) => template.id === 'custom') ? gameTemplates : [...gameTemplates, CUSTOM_BLUEPRINT];
  }, [form.game]);
  const selectedBlueprint = blueprints.find((blueprint) => blueprint.id === selectedBlueprintId);

  useEffect(() => {
    let alive = true;
    apiClient.get<{ games: CatalogGame[] }>('/api/games/catalog')
      .then((catalog) => {
        if (alive) setCatalogGames(catalog.games ?? []);
      })
      .catch((error) => {
        console.warn('[SeasonCreate] Catalog endpoint unavailable; falling back to packaged game list.', error);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!form.game) {
      setSelectedBlueprintId('');
      return;
    }
    const gameTemplate = getTemplatesForGame(form.game)[0];
    setSelectedBlueprintId(gameTemplate?.id ?? 'custom');
  }, [form.game]);

  useEffect(() => {
    if (!selectedGame) return;
    const currentMode = selectedGame.modes.find((mode) => mode.modeKey === form.gameMode);
    const nextMode = currentMode ?? selectedGame.modes.find((mode) => mode.modeKey === selectedGame.defaultModeKey) ?? selectedGame.modes[0];
    if (nextMode && nextMode.modeKey !== form.gameMode) {
      setForm((current) => ({
        ...current,
        gameMode: nextMode.modeKey,
        participantMode: nextMode.participantMode,
      }));
    }
  }, [selectedGame, form.gameMode]);

  useEffect(() => {
    setForm(INITIAL_FORM);
    setSelectedBlueprintId('');
    setErrors({});
    setCreatedSeason(null);

  }, []);

  useEffect(() => {
    const sections: Array<[SectionId, HTMLDivElement | null]> = [
      ['directive', directiveRef.current],
      ['blueprint', blueprintRef.current],
      ['launch', launchRef.current],
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const matched = sections.find(([, element]) => element === visible.target);
        if (matched) {
          setActiveSection(matched[0]);
        }
      },
      { threshold: [0.25, 0.45, 0.7] },
    );

    sections.forEach(([, element]) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleGameSelect = (gameName: string) => {
    const game = gameOptions.find((item) => item.name === gameName);
    const mode = game?.modes.find((item) => item.modeKey === game.defaultModeKey) ?? game?.modes[0];
    setForm((current) => ({
      ...current,
      game: gameName,
      gameMode: mode?.modeKey ?? '',
      participantMode: mode?.participantMode ?? 'team',
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.blueprint;
      return next;
    });
    window.setTimeout(() => scrollTo(blueprintRef.current), 120);
  };

  const handleBlueprintSelect = (blueprintId: string) => {
    setSelectedBlueprintId(blueprintId);
    setErrors((current) => {
      const next = { ...current };
      delete next.blueprint;
      return next;
    });
    window.setTimeout(() => scrollTo(launchRef.current), 120);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (form.name.trim().length < 3) {
      nextErrors.name = 'Season name must be at least 3 characters.';
    }

    if (!form.game) {
      nextErrors.game = 'Select the game this season is built for.';
    }

    if (!form.gameMode) {
      nextErrors.gameMode = 'Select the game mode for this season.';
    }

    if (!form.region.trim()) {
      nextErrors.region = 'Select the season region.';
    }

    if (!selectedBlueprintId) {
      nextErrors.blueprint = 'Select a blueprint or custom start.';
    }

    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      nextErrors.endDate = 'End date must be on or after the start date.';
    }

    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.game || nextErrors.endDate) {
      scrollTo(directiveRef.current);
    } else if (nextErrors.blueprint) {
      scrollTo(blueprintRef.current);
    }

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload: CreateSeasonRequest = {
      name: form.name.trim(),
      game: form.game,
      gameMode: form.gameMode,
      region: form.region.trim(),
      teamSize: selectedMode?.teamSize,
      participant_mode: selectedMode?.participantMode ?? form.participantMode,
      description: form.description.trim() || undefined,
      start_date: form.startDate || undefined,
      end_date: form.endDate || undefined,
      banner_url: form.bannerUrl.trim() || undefined,
      logo_url: form.logoUrl.trim() || undefined,
    };

    try {
      const season = await createSeason.mutateAsync(payload);
      const templatePlan = buildSeasonTemplatePlan({
        seasonId: season.id,
        rootNodeId: season.rootNodeId,
        templateId: selectedBlueprintId,
        startDate: form.startDate,
      });
      if (templatePlan) {
        try {
          await seasonApi.syncSeasonNodes(season.id, templatePlan.nodes);
          await seasonApi.syncSeasonRules(season.id, templatePlan.rules);
        } catch (templateError) {
          logSeasonCreationError('applyTemplate', templateError, {
            seasonId: season.id,
            selectedGame: form.game,
            templateId: selectedBlueprintId,
            nodeCount: templatePlan.nodes.length,
            ruleCount: templatePlan.rules.length,
            ruleRanges: templatePlan.rules.map((rule) => `${rule.placementFrom}-${rule.placementTo}`),
          });
          setCreatedSeason(season);
          toast({
            title: 'Season draft created',
            description: 'The template could not be applied automatically. Opening the planner so you can finish setup manually.',
            variant: 'destructive',
          });
          window.setTimeout(() => navigate(`/season/setup/${season.id}/plan`), 450);
          return;
        }
      }
      setCreatedSeason(season);
      toast({
        title: 'Season created',
        description: templatePlan ? 'Template structure applied. Opening the season planner.' : 'Opening the season planner.',
      });
      window.setTimeout(() => navigate(`/season/setup/${season.id}/plan`), 450);
    } catch (error) {
      logSeasonCreationError('createSeason', error, {
        selectedGame: form.game,
        templateId: selectedBlueprintId,
        payload: {
          name: payload.name,
          game: payload.game,
          gameMode: payload.gameMode,
          region: payload.region,
          participant_mode: payload.participant_mode,
          hasStartDate: Boolean(payload.start_date),
          hasEndDate: Boolean(payload.end_date),
          usesServerDerivedOrganization: true,
        },
      });
      toast({
        title: 'Could not create season',
        description: 'Please check the season details and try again. Technical details were logged for debugging.',
        variant: 'destructive',
      });
    }
  };

  const completion = {
    directive: Boolean(form.name.trim().length >= 3 && form.game),
    blueprint: Boolean(selectedBlueprintId),
    launch: Boolean(form.name.trim().length >= 3 && form.game && selectedBlueprintId),
  };

  return (
    <div className="esportra-ambient-page min-h-screen text-white">
      {createdSeason && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-rose-500/10 backdrop-blur-md">
          <div className="border border-rose-400/40 bg-black px-10 py-8 text-center shadow-2xl shadow-rose-500/20">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-rose-500 text-white">
              <Check className="h-7 w-7" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-rose-300">Circuit initialized</p>
            <h2 className="mt-3 text-2xl font-black uppercase tracking-tight">{createdSeason.name}</h2>
            <p className="mt-2 text-sm text-zinc-500">Opening planner...</p>
          </div>
        </div>
      )}

      <main className="esportra-ambient-content mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <section className="mb-16 max-w-4xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-rose-400">Season Architect</p>
          <h1 className="mt-5 text-5xl font-black uppercase tracking-[-0.05em] text-white md:text-7xl">
            Architect a championship season.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400">
            Build a governed multi-tournament circuit with explicit structure, controlled publishing, and a professional management command center.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            <section ref={directiveRef} className="border border-white/10 bg-black/40 p-6 lg:p-8">
              <SectionHeader index="01" title="Directive" description="Define the season identity and competitive constraints." complete={completion.directive} />

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <Field label="Circuit designation" error={errors.name}>
                  <Input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    placeholder="MENA Valorant Championship"
                    className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </Field>

                <Field label="Region" error={errors.region}>
                  <Input
                    value={form.region}
                    onChange={(event) => updateForm('region', event.target.value)}
                    placeholder="MENA, EU West, Pakistan"
                    className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </Field>

                {selectedGame && (
                  <Field label="Game mode" error={errors.gameMode} className="lg:col-span-2">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedGame.modes.map((mode) => (
                      <button
                        key={mode.modeKey}
                        onClick={() => setForm((current) => ({ ...current, gameMode: mode.modeKey, participantMode: mode.participantMode }))}
                        className={cn(
                          'border px-4 py-4 text-left transition-colors',
                          form.gameMode === mode.modeKey ? 'border-rose-500/70 bg-rose-500/10 text-white' : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white',
                        )}
                      >
                        <span className="block font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">{mode.modeGroup ?? mode.participantMode}</span>
                        <span className="mt-2 block text-sm font-bold text-white">{mode.variantLabel ?? mode.name}</span>
                        <span className="mt-1 block text-xs text-zinc-500">{mode.teamSize} starter{mode.teamSize === 1 ? '' : 's'}</span>
                      </button>
                      ))}
                    </div>
                  </Field>
                )}

                <div className="lg:col-span-2">
                  <Field label="Game engine" error={errors.game}>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {gameOptions.slice(0, 12).map((game) => (
                        <button
                          key={game.slug}
                          onClick={() => handleGameSelect(game.name)}
                          className={cn(
                            'group border-2 bg-white/[0.02] p-4 text-left transition-colors hover:border-white/20',
                            form.game === game.name ? 'border-rose-500/60 bg-rose-500/5' : 'border-white/10',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center border border-white/10 bg-black">
                              <Gamepad2 className="h-5 w-5 text-rose-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{game.name}</p>
                              <p className="mt-1 text-[11px] text-zinc-500">{game.category}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <Field label="Start date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateForm('startDate', event.target.value)}
                    className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </Field>

                <Field label="End date" error={errors.endDate}>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateForm('endDate', event.target.value)}
                    className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </Field>

                <Field label="Mission brief" className="lg:col-span-2">
                  <Textarea
                    value={form.description}
                    onChange={(event) => updateForm('description', event.target.value)}
                    placeholder="Describe the competitive narrative, eligibility, and season goals."
                    className="min-h-32 rounded-none border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </Field>

                <Field label="Banner asset URL">
                  <Input
                    value={form.bannerUrl}
                    onChange={(event) => updateForm('bannerUrl', event.target.value)}
                    placeholder="https://..."
                    className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </Field>

                <Field label="Logo asset URL">
                  <Input
                    value={form.logoUrl}
                    onChange={(event) => updateForm('logoUrl', event.target.value)}
                    placeholder="https://..."
                    className="h-12 rounded-none border-white/10 bg-white/[0.03] text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </Field>
              </div>
            </section>

            <section ref={blueprintRef} className="border border-white/10 bg-black/40 p-6 lg:p-8">
              <SectionHeader index="02" title="Blueprint" description="Choose the safe starter for this game. Only backend-compatible templates are shown." complete={completion.blueprint} />

              {errors.blueprint && (
                <div className="mt-6 flex items-center gap-2 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.blueprint}
                </div>
              )}

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {blueprints.map((blueprint) => {
                  const Icon = blueprint.icon;

                  return (
                    <button
                      key={blueprint.id}
                      onClick={() => handleBlueprintSelect(blueprint.id)}
                      className={cn(
                        'group min-h-52 border-2 bg-white/[0.02] p-5 text-left transition-colors hover:border-white/20',
                        selectedBlueprintId === blueprint.id ? 'border-rose-500/60 bg-rose-500/5' : 'border-white/10',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-black text-rose-400">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className={cn('h-4 w-4 border', selectedBlueprintId === blueprint.id ? 'border-rose-400 bg-rose-500' : 'border-white/20')} />
                      </div>
                      <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">{blueprint.meta}</p>
                      <h3 className="mt-2 text-xl font-black uppercase tracking-tight text-white">{blueprint.name}</h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">{blueprint.description}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section ref={launchRef} className="border border-white/10 bg-black/40 p-6 lg:p-8">
              <SectionHeader index="03" title="Launch" description="Review the shell. Selected templates will seed the season planner before management opens." complete={completion.launch} />

              <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="border border-white/10 bg-white/[0.03] p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Season packet</p>
                  <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-white">{form.name || 'Untitled season'}</h2>
                  <div className="mt-6 grid gap-3 text-sm">
                    <SummaryRow label="Game" value={form.game || 'Not selected'} />
                    <SummaryRow label="Mode" value={selectedMode ? `${selectedMode.modeGroup ? `${selectedMode.modeGroup} ` : ''}${selectedMode.variantLabel ?? selectedMode.name} (${selectedMode.teamSize})` : 'Not selected'} />
                    <SummaryRow label="Region" value={form.region || 'Not selected'} />
                    <SummaryRow label="Blueprint" value={selectedBlueprint?.name ?? 'Not selected'} />
                    <SummaryRow label="Window" value={form.startDate || form.endDate ? `${form.startDate || 'Open'} → ${form.endDate || 'Open'}` : 'No schedule set'} />
                    <SummaryRow label="Public setup" value="Draft command center" />
                  </div>
                </div>

                <div className="border border-rose-500/30 bg-rose-500/[0.04] p-6">
                  <Trophy className="h-10 w-10 text-rose-400" />
                  <h3 className="mt-5 text-xl font-black uppercase tracking-tight">Initialize circuit</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-400">
                    This creates the season shell as a draft and applies the selected blueprint into the planner before publishing.
                  </p>
                  <Button
                    onClick={handleSubmit}
                    disabled={createSeason.isPending}
                    className="mt-6 h-14 w-full rounded-none bg-rose-500 font-bold uppercase tracking-[0.18em] text-white hover:bg-rose-400 active:bg-rose-600"
                  >
                    {createSeason.isPending ? 'Initializing...' : 'Initialize circuit'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 border border-white/10 bg-black/50 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">Progress</p>
              <div className="mt-5 space-y-2">
                <ProgressButton label="Directive" active={activeSection === 'directive'} complete={completion.directive} onClick={() => scrollTo(directiveRef.current)} />
                <ProgressButton label="Blueprint" active={activeSection === 'blueprint'} complete={completion.blueprint} onClick={() => scrollTo(blueprintRef.current)} />
                <ProgressButton label="Launch" active={activeSection === 'launch'} complete={completion.launch} onClick={() => scrollTo(launchRef.current)} />
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-xs leading-5 text-zinc-500">
                  {selectedGame ? `${selectedGame.name} selected. ${selectedGame.category ?? 'Catalog-backed game'}` : 'Select a game to unlock the blueprint decision.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

const SectionHeader = ({ index, title, description, complete }: { index: string; title: string; description: string; complete: boolean }) => (
  <div className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.5em] text-zinc-600">Section {index}</p>
      <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
    </div>
    <div className={cn('flex h-10 w-10 items-center justify-center border', complete ? 'border-rose-500 bg-rose-500 text-white' : 'border-white/10 text-zinc-600')}>
      <Check className="h-5 w-5" />
    </div>
  </div>
);

const Field = ({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) => (
  <div className={cn('space-y-2', className)}>
    <div className="flex items-center justify-between gap-3">
      <label className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">{label}</label>
      {error && <span className="text-right text-xs text-red-400">{error}</span>}
    </div>
    {children}
  </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3 last:border-b-0">
    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{label}</span>
    <span className="text-right font-medium text-zinc-200">{value}</span>
  </div>
);

const ProgressButton = ({ label, active, complete, onClick }: { label: string; active: boolean; complete: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex w-full items-center justify-between border px-3 py-3 text-left transition-colors',
      active ? 'border-rose-500/60 bg-rose-500/10 text-white' : 'border-white/10 bg-white/[0.02] text-zinc-500 hover:border-white/20 hover:text-white',
    )}
  >
    <span className="font-mono text-[10px] uppercase tracking-[0.24em]">{label}</span>
    <span className={cn('h-2 w-2', complete ? 'bg-rose-500' : 'bg-zinc-700')} />
  </button>
);

export default SeasonWizard;
