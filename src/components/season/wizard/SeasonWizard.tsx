import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSeason } from '@/hooks/useSeasons';
import { useToast } from '@/hooks/use-toast';
import { fullSeasonSchema, validateSeasonStep } from '@/schemas/seasonSchema';
import { cn } from '@/lib/utils';
import type { CreateSeasonPayload } from '@/types/season';
import { DEFAULT_SEASON_WIZARD_DATA, SEASON_WIZARD_STEPS, type SeasonWizardData } from '@/types/seasonWizard';
import esportsGames from '@/data/esportsGames.json';

interface SeasonWizardProps {
  cancelHref?: string;
  cancelLabel?: string;
}

const statusLabels: Record<SeasonWizardData['status'], string> = {
  draft: 'Draft',
  published: 'Published',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
};

const participantModeLabels: Record<SeasonWizardData['participantMode'], string> = {
  team: 'Teams',
  solo: 'Solo players',
};

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const SeasonWizard = ({ cancelHref = '/organizer/seasons', cancelLabel = 'Cancel' }: SeasonWizardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createSeason = useCreateSeason();
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<SeasonWizardData>({
    resolver: zodResolver(fullSeasonSchema),
    defaultValues: DEFAULT_SEASON_WIZARD_DATA,
    mode: 'onBlur',
  });

  const values = form.watch();
  const games = useMemo(
    () => esportsGames.games.map((game) => ({ name: game.name, category: game.category })),
    [],
  );

  const goToStep = async (targetStep: number) => {
    const validation = validateSeasonStep(currentStep, form.getValues());
    form.clearErrors();

    if (!validation.valid) {
      Object.entries(validation.errors).forEach(([field, message]) => {
        if (field === '_form') return;
        form.setError(field as keyof SeasonWizardData, { type: 'manual', message });
      });
      return;
    }

    setCurrentStep(targetStep);
  };

  const handleSubmit = form.handleSubmit(async (data) => {
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
      rootNodeName: toNullable(data.rootNodeName),
    };

    try {
      const season = await createSeason.mutateAsync(payload);
      toast({
        title: 'Season created',
        description: 'The season shell is ready. Configure structure, staff, and rules next.',
      });
      navigate(`/organizer/seasons/${season.id}?tab=structure`);
    } catch (error) {
      toast({
        title: 'Season creation failed',
        description: error instanceof Error ? error.message : 'Unable to create the season right now.',
        variant: 'destructive',
      });
    }
  });

  return (
    <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 text-white shadow-[0_25px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
            <Sparkles className="h-3.5 w-3.5" />
            Season creation wizard
          </div>
          <h2 className="text-3xl font-black tracking-tight">Create a season tree foundation</h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Start with the season shell, then land in the management view to wire qualifiers, finals, staff,
            points rules, and qualification flows.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {SEASON_WIZARD_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
              className={cn(
                'rounded-2xl border px-4 py-3 text-left transition-all',
                step.id === currentStep
                  ? 'border-rose-500/40 bg-rose-500/10 text-white'
                  : step.id < currentStep
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-zinc-400',
              )}
            >
              <p className="text-xs uppercase tracking-[0.18em]">{step.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{step.description}</p>
            </button>
          ))}
        </div>
      </div>

      <form className="space-y-8" onSubmit={handleSubmit}>
        {currentStep === 1 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="season-name">Season name</Label>
              <Input
                id="season-name"
                placeholder="Pakistan Circuit 2026"
                className="border-white/10 bg-white/5 text-white"
                {...form.register('name')}
              />
              {form.formState.errors.name && <p className="text-sm text-red-300">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Game</Label>
              <Controller
                control={form.control}
                name="game"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select a game" />
                    </SelectTrigger>
                    <SelectContent>
                      {games.map((game) => (
                        <SelectItem key={game.name} value={game.name}>
                          {game.name} · {game.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.game && <p className="text-sm text-red-300">{form.formState.errors.game.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Participant mode</Label>
              <Controller
                control={form.control}
                name="participantMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value: SeasonWizardData['participantMode']) => field.onChange(value)}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Teams</SelectItem>
                      <SelectItem value="solo">Solo players</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="season-slug">Slug</Label>
              <Input
                id="season-slug"
                placeholder="Optional custom slug"
                className="border-white/10 bg-white/5 text-white"
                {...form.register('slug')}
              />
              {form.formState.errors.slug && <p className="text-sm text-red-300">{form.formState.errors.slug.message}</p>}
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="season-description">Description</Label>
              <Textarea
                id="season-description"
                placeholder="Describe the circuit, qualifier structure, and finals flow."
                className="min-h-[160px] border-white/10 bg-white/5 text-white"
                {...form.register('description')}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-300">{form.formState.errors.description.message}</p>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value: SeasonWizardData['status']) => field.onChange(value)}>
                    <SelectTrigger className="border-white/10 bg-white/5 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">Public season page</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Published seasons can expose hierarchy, standings, and qualification state publicly.
                  </p>
                </div>
                <Controller
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">Allow manual overrides</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Enables organizer correction flows for qualification records and downstream placements.
                  </p>
                </div>
                <Controller
                  control={form.control}
                  name="allowManualOverrides"
                  render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="season-start">Start date</Label>
              <Input
                id="season-start"
                type="date"
                className="border-white/10 bg-white/5 text-white"
                {...form.register('startDate')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="season-end">End date</Label>
              <Input
                id="season-end"
                type="date"
                className="border-white/10 bg-white/5 text-white"
                {...form.register('endDate')}
              />
              {form.formState.errors.endDate && <p className="text-sm text-red-300">{form.formState.errors.endDate.message}</p>}
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="season-root-label">Root node label</Label>
              <Input
                id="season-root-label"
                placeholder="Season Tree"
                className="border-white/10 bg-white/5 text-white"
                {...form.register('rootNodeName')}
              />
              <p className="text-sm text-zinc-400">
                This creates the top-level node. You will add city qualifiers, finals, and linked tournaments next.
              </p>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold">Ready to create</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Season</p>
                  <p className="mt-1 font-semibold text-white">{values.name || 'Untitled season'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Game</p>
                  <p className="mt-1 font-semibold text-white">{values.game || 'Not selected'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Mode</p>
                  <p className="mt-1 font-semibold text-white">{participantModeLabels[values.participantMode]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Status</p>
                  <p className="mt-1 font-semibold text-white">{statusLabels[values.status]}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Visibility</p>
                  <p className="mt-1 font-semibold text-white">{values.isPublic ? 'Public' : 'Private'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Overrides</p>
                  <p className="mt-1 font-semibold text-white">{values.allowManualOverrides ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Schedule</p>
                  <p className="mt-1 font-semibold text-white">
                    {values.startDate || 'Open'} {values.endDate ? `→ ${values.endDate}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Root node</p>
                  <p className="mt-1 font-semibold text-white">{values.rootNodeName || 'Season Tree'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
              <div className="flex items-center gap-3 text-emerald-200">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="text-lg font-semibold">After creation</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-emerald-50/90">
                <li>Link tournaments and stages to nodes.</li>
                <li>Add co-organizers and season admins.</li>
                <li>Configure points rules and qualification destinations.</li>
                <li>Recalculate standings after qualifiers complete.</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={currentStep === 1 || createSeason.isPending}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              onClick={() => navigate(cancelHref)}
            >
              {cancelLabel}
            </Button>

            {currentStep < SEASON_WIZARD_STEPS.length ? (
              <Button type="button" className="bg-rose-500 text-white hover:bg-rose-600" onClick={() => goToStep(currentStep + 1)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" className="bg-rose-500 text-white hover:bg-rose-600" disabled={createSeason.isPending}>
                {createSeason.isPending ? 'Creating...' : 'Create season'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default SeasonWizard;

