import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm, type UseFormSetError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Globe,
  Lock,
  Network,
  Users,
} from 'lucide-react';
import SeasonStructureBuilder from '@/components/season/builder/SeasonStructureBuilder';
import SeasonTreePreview from '@/components/season/SeasonTreePreview';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  buildSeasonTreeFromDrafts,
  countConfiguredStages,
  createSeasonBuilderRootNode,
  normalizeSeasonBuilderNodes,
  validateAdvancementGraph,
  validateSeasonBuilderNodes,
} from '@/components/season/builder/seasonBuilderUtils';
import { useCreateSeasonWorkspace } from '@/hooks/useSeasons';
import { fetchGameData, type CachedGame } from '@/hooks/useRawgGame';
import { useToast } from '@/hooks/use-toast';
import { fullSeasonSchema, validateSeasonStep } from '@/schemas/seasonSchema';
import { cn } from '@/lib/utils';
import type { CreateSeasonPayload, SeasonBuilderNode } from '@/types/season';
import { DEFAULT_SEASON_WIZARD_DATA, SEASON_WIZARD_STEPS, type SeasonWizardData } from '@/types/seasonWizard';
import esportsGames from '@/data/esportsGames.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<SeasonWizardData['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const setFormErrors = (
  setError: UseFormSetError<SeasonWizardData>,
  errors: Record<string, string>,
) => {
  Object.entries(errors).forEach(([field, message]) => {
    if (field === '_form') return;
    setError(field as keyof SeasonWizardData, { type: 'manual', message });
  });
};

const STEP_VARIANTS = {
  enter: (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
};
const STEP_TRANSITION = { type: 'spring', stiffness: 320, damping: 32 };

// ---------------------------------------------------------------------------
// IGDB art hook — fires when the selected game changes
// ---------------------------------------------------------------------------

const useGameArt = (gameName: string) => {
  const [art, setArt] = useState<CachedGame | null>(null);

  useEffect(() => {
    if (!gameName) { setArt(null); return; }
    let alive = true;
    void fetchGameData(gameName, { skipRawg: true })
      .then((data) => { if (alive) setArt(data); })
      .catch(() => { /* decorative — fail silently */ });
    return () => { alive = false; };
  }, [gameName]);

  const banner = art ? (art.screenshots[0] ?? art.gameBanner ?? art.cover ?? null) : null;
  const cover = art?.cover ?? null;
  return { banner, cover };
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SeasonWizardProps {
  cancelHref?: string;
  cancelLabel?: string;
}

// ---------------------------------------------------------------------------
// SeasonWizard
// ---------------------------------------------------------------------------

const SeasonWizard = ({
  cancelHref = '/organizer/seasons',
  cancelLabel = 'Cancel',
}: SeasonWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createSeasonWorkspace = useCreateSeasonWorkspace();

  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<SeasonBuilderNode[]>([createSeasonBuilderRootNode()]);

  const form = useForm<SeasonWizardData>({
    resolver: zodResolver(fullSeasonSchema),
    defaultValues: DEFAULT_SEASON_WIZARD_DATA,
    mode: 'onBlur',
  });

  const values = form.watch();

  const games = useMemo(
    () => esportsGames.games.map((g) => ({ name: g.name, category: g.category })),
    [],
  );

  const treePreview = useMemo(
    () => buildSeasonTreeFromDrafts('draft-season', normalizeSeasonBuilderNodes(nodes)),
    [nodes],
  );

  const configCounts = useMemo(() => countConfiguredStages(nodes), [nodes]);
  const advancementIssues = useMemo(() => validateAdvancementGraph(normalizeSeasonBuilderNodes(nodes)), [nodes]);
  const advancementErrors = advancementIssues.filter((i) => i.severity === 'error');
  const advancementWarnings = advancementIssues.filter((i) => i.severity === 'warning');

  const { banner: gameBanner, cover: gameCover } = useGameArt(values.game);

  const syncRootName = () => {
    const seasonName = form.getValues('name').trim();
    setNodes((cur) => {
      const root = cur[0];
      if (!root || (root.name.trim().length > 0 && root.name !== 'Season Tree')) return cur;
      return [{ ...root, name: seasonName || 'Season Tree' }, ...cur.slice(1)];
    });
  };

  const goToStep = async (target: number) => {
    if (currentStep === 1) {
      form.clearErrors();
      const v = validateSeasonStep(1, form.getValues());
      if (!v.valid) { setFormErrors(form.setError, v.errors); return; }
      syncRootName();
    }
    if (currentStep === 2) {
      const v = validateSeasonBuilderNodes(nodes);
      if (!v.valid) { setStructureError(v.message); return; }
    }
    setStructureError(null);
    setDirection(target > currentStep ? 1 : -1);
    setCurrentStep(target);
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    const sv = validateSeasonBuilderNodes(nodes);
    if (!sv.valid) {
      setDirection(-1);
      setCurrentStep(2);
      setStructureError(sv.message);
      return;
    }

    const normalized = normalizeSeasonBuilderNodes(nodes);
    const payload: CreateSeasonPayload = {
      name: data.name.trim(),
      game: data.game,
      participantMode: data.participantMode,
      status: data.status,
      slug: toNullable(data.slug),
      description: toNullable(data.description),
      isPublic: data.isPublic,
      allowManualOverrides: data.allowManualOverrides,
      startDate: toNullable(data.startDate),
      endDate: toNullable(data.endDate),
      rootNodeName: normalized[0]?.name.trim() || data.name.trim(),
    };

    try {
      const season = await createSeasonWorkspace.mutateAsync({
        season: payload,
        nodes: normalizeSeasonBuilderNodes(nodes),
      });
      toast({ title: 'Season created', description: 'Your workspace is ready.' });
      navigate(`/organizer/seasons/${season.id}?tab=structure`);
    } catch (error) {
      toast({
        title: 'Season creation failed',
        description: error instanceof Error ? error.message : 'Unable to create the season right now.',
        variant: 'destructive',
      });
    }
  });

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#0a0a0c]">
      {/* Ambient IGDB backdrop */}
      <AnimatePresence>
        {gameBanner && (
          <motion.div
            key={gameBanner}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
            className="pointer-events-none absolute inset-0 z-0"
          >
            <img
              src={gameBanner}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
              style={{ filter: 'blur(60px) saturate(1.4)', opacity: 0.07 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layout */}
      <div className="relative z-10 flex min-h-[780px]">

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <aside className="hidden w-[264px] shrink-0 flex-col border-r border-white/[0.05] p-8 lg:flex">
          {/* Identity */}
          <div className="mb-7 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
              <Network className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="font-body text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
              New Season
            </span>
          </div>

          {/* Season name preview */}
          <div className="mb-8 min-h-[48px]">
            <p className="font-heading truncate text-base font-bold leading-snug text-white">
              {values.name || 'Untitled Season'}
            </p>
            {values.game && (
              <p className="font-body mt-0.5 truncate text-[12px] text-zinc-500">{values.game}</p>
            )}
          </div>

          {/* Vertical step list */}
          <nav className="flex flex-col">
            {SEASON_WIZARD_STEPS.map((step, idx) => {
              const done = step.id < currentStep;
              const active = step.id === currentStep;
              return (
                <div key={step.id} className="flex gap-3.5">
                  {/* Indicator column */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      disabled={step.id > currentStep}
                      onClick={() => { if (done) void goToStep(step.id); }}
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all',
                        active && 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.45)]',
                        done && 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
                        !active && !done && 'border border-white/15 text-zinc-600',
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : step.id}
                    </button>
                    {idx < SEASON_WIZARD_STEPS.length - 1 && (
                      <div
                        className={cn(
                          'my-1 w-px flex-1',
                          done ? 'bg-emerald-500/30' : 'bg-white/[0.06]',
                        )}
                        style={{ minHeight: 32 }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="pb-8">
                    <p
                      className={cn(
                        'font-body text-[13px] font-medium transition-colors',
                        active ? 'text-white' : done ? 'text-zinc-400' : 'text-zinc-600',
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="font-body mt-0.5 text-[11px] text-zinc-600">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile step strip */}
          <div className="flex items-center gap-2 border-b border-white/[0.05] px-6 py-4 lg:hidden">
            {SEASON_WIZARD_STEPS.map((step, idx) => (
              <div key={step.id} className="flex flex-1 items-center gap-2 last:flex-none">
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    step.id === currentStep && 'bg-cyan-500 text-white',
                    step.id < currentStep && 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
                    step.id > currentStep && 'border border-white/15 text-zinc-600',
                  )}
                >
                  {step.id < currentStep ? <Check className="h-3 w-3" /> : step.id}
                </div>
                {idx < SEASON_WIZARD_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-px flex-1',
                      step.id < currentStep ? 'bg-emerald-500/30' : 'bg-white/[0.06]',
                    )}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step area + nav wrapped in form */}
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait" custom={direction}>

                {/* ── Step 1: Essentials ─────────────────────────────────── */}
                {currentStep === 1 && (
                  <motion.div
                    key="s1"
                    custom={direction}
                    variants={STEP_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={STEP_TRANSITION}
                    className="p-8"
                  >
                    <div className="mb-7">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-500/70">
                        Step 1 of 3
                      </p>
                      <h2 className="font-heading mt-1.5 text-2xl font-bold tracking-tight text-white">
                        Season Essentials
                      </h2>
                      <p className="font-body mt-1 text-[13px] text-zinc-500">
                        Define the core identity and settings for this season.
                      </p>
                    </div>

                    <div className="grid gap-8 xl:grid-cols-[1fr_300px]">
                      {/* Fields */}
                      <div className="space-y-5">
                        {/* Name */}
                        <div className="space-y-1.5">
                          <Label htmlFor="s-name" className="text-[13px] text-zinc-400">
                            Season name
                          </Label>
                          <Input
                            id="s-name"
                            placeholder="e.g. Pakistan Circuit 2026"
                            className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600 focus-visible:border-cyan-500/40 focus-visible:ring-cyan-500/20"
                            {...form.register('name')}
                          />
                          {form.formState.errors.name && (
                            <p className="text-[12px] text-red-400">{form.formState.errors.name.message}</p>
                          )}
                        </div>

                        {/* Game */}
                        <div className="space-y-1.5">
                          <Label className="text-[13px] text-zinc-400">Game</Label>
                          <Controller
                            control={form.control}
                            name="game"
                            render={({ field }) => (
                              <div className="relative">
                                {gameCover && (
                                  <div className="pointer-events-none absolute left-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 overflow-hidden rounded-lg border border-white/10">
                                    <img src={gameCover} alt="" className="h-full w-full object-cover" />
                                  </div>
                                )}
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger
                                    className={cn(
                                      'h-11 rounded-xl border-white/10 bg-white/[0.04] text-white focus:border-cyan-500/40 focus:ring-cyan-500/20',
                                      gameCover && 'pl-11',
                                    )}
                                  >
                                    <SelectValue placeholder="Select a game" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {games.map((g) => (
                                      <SelectItem key={g.name} value={g.name}>
                                        {g.name} · {g.category}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          />
                          {form.formState.errors.game && (
                            <p className="text-[12px] text-red-400">{form.formState.errors.game.message}</p>
                          )}
                        </div>

                        {/* Participant mode — visual cards */}
                        <div className="space-y-1.5">
                          <Label className="text-[13px] text-zinc-400">Participant mode</Label>
                          <Controller
                            control={form.control}
                            name="participantMode"
                            render={({ field }) => (
                              <div className="grid grid-cols-2 gap-3">
                                {(
                                  [
                                    {
                                      value: 'team',
                                      label: 'Teams',
                                      sub: 'Squads, rosters & captains',
                                    },
                                    {
                                      value: 'solo',
                                      label: 'Solo players',
                                      sub: 'Individual competitors',
                                    },
                                  ] as const
                                ).map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => field.onChange(opt.value)}
                                    className={cn(
                                      'flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all',
                                      field.value === opt.value
                                        ? 'border-cyan-500/35 bg-cyan-500/[0.07]'
                                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15',
                                    )}
                                  >
                                    <Users
                                      className={cn(
                                        'h-5 w-5',
                                        field.value === opt.value ? 'text-cyan-400' : 'text-zinc-600',
                                      )}
                                    />
                                    <div>
                                      <p
                                        className={cn(
                                          'font-body text-[13px] font-semibold',
                                          field.value === opt.value ? 'text-white' : 'text-zinc-500',
                                        )}
                                      >
                                        {opt.label}
                                      </p>
                                      <p className="font-body mt-0.5 text-[11px] text-zinc-600">
                                        {opt.sub}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          />
                        </div>

                        {/* Status + Slug */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label className="text-[13px] text-zinc-400">Initial status</Label>
                            <Controller
                              control={form.control}
                              name="status"
                              render={({ field }) => (
                                <Select
                                  value={field.value}
                                  onValueChange={(v: SeasonWizardData['status']) =>
                                    field.onChange(v)
                                  }
                                >
                                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(
                                      Object.entries(STATUS_LABELS) as [
                                        SeasonWizardData['status'],
                                        string,
                                      ][]
                                    ).map(([v, l]) => (
                                      <SelectItem key={v} value={v}>
                                        {l}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="s-slug" className="text-[13px] text-zinc-400">
                              Slug{' '}
                              <span className="text-zinc-600">(optional)</span>
                            </Label>
                            <Input
                              id="s-slug"
                              placeholder="pakistan-circuit-2026"
                              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600"
                              {...form.register('slug')}
                            />
                            {form.formState.errors.slug && (
                              <p className="text-[12px] text-red-400">
                                {form.formState.errors.slug.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="s-start"
                              className="flex items-center gap-1.5 text-[13px] text-zinc-400"
                            >
                              <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                              Start date
                            </Label>
                            <Input
                              id="s-start"
                              type="date"
                              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white"
                              {...form.register('startDate')}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="s-end"
                              className="flex items-center gap-1.5 text-[13px] text-zinc-400"
                            >
                              <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                              End date
                            </Label>
                            <Input
                              id="s-end"
                              type="date"
                              className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-white"
                              {...form.register('endDate')}
                            />
                            {form.formState.errors.endDate && (
                              <p className="text-[12px] text-red-400">
                                {form.formState.errors.endDate.message}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-3">
                          {(
                            [
                              {
                                name: 'isPublic' as const,
                                label: 'Public season page',
                                sub: 'Publish standings and qualification state',
                              },
                              {
                                name: 'allowManualOverrides' as const,
                                label: 'Allow manual overrides',
                                sub: 'Keep organizer correction tools available',
                              },
                            ]
                          ).map((t) => (
                            <div
                              key={t.name}
                              className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
                            >
                              <div>
                                <p className="font-body text-[13px] font-medium text-white">
                                  {t.label}
                                </p>
                                <p className="font-body mt-0.5 text-[11px] text-zinc-500">{t.sub}</p>
                              </div>
                              <Controller
                                control={form.control}
                                name={t.name}
                                render={({ field }) => (
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                )}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <Label htmlFor="s-desc" className="text-[13px] text-zinc-400">
                            Description{' '}
                            <span className="text-zinc-600">(optional)</span>
                          </Label>
                          <Textarea
                            id="s-desc"
                            placeholder="Describe the circuit, how qualifiers connect, and what the season leads into."
                            className="min-h-[110px] rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-zinc-600"
                            {...form.register('description')}
                          />
                          {form.formState.errors.description && (
                            <p className="text-[12px] text-red-400">
                              {form.formState.errors.description.message}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Live preview card */}
                      <div className="hidden xl:block">
                        <div className="sticky top-6 overflow-hidden rounded-3xl border border-white/[0.06]">
                          {/* Game art header */}
                          <div className="relative h-24 bg-[#111113]">
                            {gameBanner ? (
                              <img
                                src={gameBanner}
                                alt=""
                                className="h-full w-full object-cover opacity-50"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Network className="h-8 w-8 text-white/10" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d10] to-transparent" />
                            {gameCover && (
                              <div className="absolute bottom-3 left-4 h-9 w-9 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                                <img
                                  src={gameCover}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          {/* Identity */}
                          <div className="bg-[#0d0d10] p-5">
                            <p className="font-heading truncate text-[15px] font-bold text-white">
                              {values.name || 'Season name'}
                            </p>
                            {values.game && (
                              <p className="font-body mt-0.5 truncate text-[12px] text-zinc-500">
                                {values.game}
                              </p>
                            )}

                            {/* Pill badges */}
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-400">
                                {values.participantMode === 'team' ? 'Teams' : 'Solo'}
                              </span>
                              <span
                                className={cn(
                                  'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                  values.status === 'published' || values.status === 'active'
                                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                                    : 'border-zinc-700/60 bg-zinc-800/40 text-zinc-500',
                                )}
                              >
                                {STATUS_LABELS[values.status]}
                              </span>
                              <span
                                className={cn(
                                  'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                                  values.isPublic
                                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-400'
                                    : 'border-white/10 bg-white/5 text-zinc-600',
                                )}
                              >
                                {values.isPublic ? 'Public' : 'Private'}
                              </span>
                            </div>

                            {(values.startDate || values.endDate) && (
                              <p className="font-body mt-3 text-[11px] text-zinc-600">
                                {values.startDate || '—'} → {values.endDate || '—'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: Structure ──────────────────────────────────── */}
                {currentStep === 2 && (
                  <motion.div
                    key="s2"
                    custom={direction}
                    variants={STEP_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={STEP_TRANSITION}
                    className="p-8"
                  >
                    <div className="mb-7">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-500/70">
                        Step 2 of 3
                      </p>
                      <h2 className="font-heading mt-1.5 text-2xl font-bold tracking-tight text-white">
                        Design the Structure
                      </h2>
                      <p className="font-body mt-1 text-[13px] text-zinc-500">
                        Map the qualification flow before you create the workspace.
                      </p>
                    </div>

                    {structureError && (
                      <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-[13px] text-red-300">
                        {structureError}
                      </div>
                    )}

                    <SeasonStructureBuilder
                      title="Season flow"
                      description="Build the hierarchy — qualifiers, linked events, and finals connect here."
                      nodes={nodes}
                      onChange={(next) => {
                        setStructureError(null);
                        setNodes(next);
                      }}
                      helperText="This structure is saved with the season and becomes the starting point in the management workspace."
                      surface="wizard"
                    />
                  </motion.div>
                )}

                {/* ── Step 3: Review ─────────────────────────────────────── */}
                {currentStep === 3 && (
                  <motion.div
                    key="s3"
                    custom={direction}
                    variants={STEP_VARIANTS}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={STEP_TRANSITION}
                    className="p-8"
                  >
                    <div className="mb-7">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-500/70">
                        Step 3 of 3
                      </p>
                      <h2 className="font-heading mt-1.5 text-2xl font-bold tracking-tight text-white">
                        Review & Launch
                      </h2>
                      <p className="font-body mt-1 text-[13px] text-zinc-500">
                        Confirm everything looks right, then create the season.
                      </p>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
                      {/* Summary */}
                      <div className="space-y-4">
                        {/* Game art identity header */}
                        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
                          {gameBanner ? (
                            <img
                              src={gameBanner}
                              alt=""
                              className="h-28 w-full object-cover opacity-40"
                            />
                          ) : (
                            <div className="h-28 bg-[#111113]" />
                          )}
                          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/60 to-transparent p-5">
                            <div className="flex items-end gap-3">
                              {gameCover && (
                                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-lg">
                                  <img src={gameCover} alt="" className="h-full w-full object-cover" />
                                </div>
                              )}
                              <div>
                                <p className="font-heading text-lg font-bold leading-tight text-white">
                                  {values.name || 'Untitled Season'}
                                </p>
                                {values.game && (
                                  <p className="font-body text-[12px] text-zinc-400">
                                    {values.game}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Stat pills */}
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3.5 py-1.5">
                            <Users className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="font-body text-[12px] font-semibold text-cyan-300">
                              {values.participantMode === 'team' ? 'Team mode' : 'Solo mode'}
                            </span>
                          </div>
                          <div
                            className={cn(
                              'flex items-center gap-2 rounded-full border px-3.5 py-1.5',
                              values.isPublic
                                ? 'border-amber-500/25 bg-amber-500/10'
                                : 'border-white/10 bg-white/5',
                            )}
                          >
                            {values.isPublic ? (
                              <Globe className="h-3.5 w-3.5 text-amber-400" />
                            ) : (
                              <Lock className="h-3.5 w-3.5 text-zinc-500" />
                            )}
                            <span
                              className={cn(
                                'font-body text-[12px] font-semibold',
                                values.isPublic ? 'text-amber-300' : 'text-zinc-500',
                              )}
                            >
                              {values.isPublic ? 'Public' : 'Private'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5">
                            <span className="font-body text-[12px] font-semibold text-zinc-400">
                              {STATUS_LABELS[values.status]}
                            </span>
                          </div>
                          {values.allowManualOverrides && (
                            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5">
                              <span className="font-body text-[12px] font-semibold text-zinc-400">
                                Overrides on
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Schedule */}
                        {(values.startDate || values.endDate) && (
                          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Schedule
                            </p>
                            <p className="font-body mt-1.5 flex items-center gap-2 text-[13px] text-zinc-300">
                              <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                              {values.startDate || '—'} → {values.endDate || '—'}
                            </p>
                          </div>
                        )}

                        {/* Description */}
                        {values.description && (
                          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                              Description
                            </p>
                            <p className="font-body mt-1.5 line-clamp-4 text-[13px] leading-relaxed text-zinc-300">
                              {values.description}
                            </p>
                          </div>
                        )}

                        {/* Config + advancement summary */}
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                          <p className="font-body text-[11px] uppercase tracking-[0.18em] text-zinc-500">Tournaments in this season</p>
                          <p className="font-heading mt-1 text-[24px] font-bold text-white">
                            {configCounts.total}
                            <span className="ml-2 text-[13px] font-semibold text-zinc-500">
                              ({configCounts.configured} configured)
                            </span>
                          </p>
                          {configCounts.configured < configCounts.total && (
                            <p className="mt-2 text-[11px] leading-relaxed text-amber-300/80">
                              {configCounts.total - configCounts.configured} tournament{configCounts.total - configCounts.configured === 1 ? '' : 's'} still need{configCounts.total - configCounts.configured === 1 ? 's' : ''} setup details (format, team size, max teams, registration type). Go back to Step 2 to finish.
                            </p>
                          )}
                        </div>

                        {/* Advancement validation */}
                        {(advancementErrors.length > 0 || advancementWarnings.length > 0) && (
                          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
                            <p className="font-body text-[11px] uppercase tracking-[0.18em] text-zinc-500">Advancement checks</p>
                            <ul className="mt-3 space-y-2">
                              {advancementErrors.map((issue, i) => (
                                <li key={`err-${i}`} className="flex gap-2 text-[12px] leading-relaxed text-red-300">
                                  <span className="mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                                  <span>{issue.message}</span>
                                </li>
                              ))}
                              {advancementWarnings.map((issue, i) => (
                                <li key={`warn-${i}`} className="flex gap-2 text-[12px] leading-relaxed text-amber-300/80">
                                  <span className="mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                  <span>{issue.message}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* After creation */}
                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.05] px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            <p className="font-body text-[13px] font-semibold text-emerald-200">
                              After creation
                            </p>
                          </div>
                          <ul className="mt-3 space-y-1.5 text-[12px] leading-relaxed text-emerald-50/60">
                            <li>Your tournaments are created as part of the season with advancement already wired.</li>
                            <li>Open the season management workspace to run registrations, standings, and live advancement.</li>
                            <li>Edit unstarted tournaments freely; completed advancement is locked unless you override it.</li>
                          </ul>
                        </div>
                      </div>

                      {/* Tree preview */}
                      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
                        {gameBanner && (
                          <img
                            src={gameBanner}
                            alt=""
                            aria-hidden
                            className="absolute inset-0 h-full w-full object-cover opacity-[0.06]"
                            style={{ filter: 'blur(24px)' }}
                          />
                        )}
                        <div className="relative p-5">
                          <p className="font-body mb-4 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                            Structure preview
                          </p>
                          <SeasonTreePreview tree={treePreview} compact />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* ── Bottom nav bar ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between border-t border-white/[0.05] px-8 py-5">
              <button
                type="button"
                disabled={currentStep === 1 || createSeasonWorkspace.isPending}
                onClick={() => void goToStep(currentStep - 1)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-all hover:bg-white/[0.06] disabled:pointer-events-none disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(cancelHref)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-zinc-400 transition-all hover:bg-white/[0.06]"
                >
                  {cancelLabel}
                </button>

                {currentStep < SEASON_WIZARD_STEPS.length ? (
                  <button
                    type="button"
                    onClick={() => void goToStep(currentStep + 1)}
                    className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-rose-400 active:bg-rose-600"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={createSeasonWorkspace.isPending}
                    className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all hover:bg-rose-400 active:bg-rose-600 disabled:opacity-60"
                  >
                    {createSeasonWorkspace.isPending ? 'Creating…' : 'Create Season'}
                    {!createSeasonWorkspace.isPending && <ArrowRight className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SeasonWizard;
