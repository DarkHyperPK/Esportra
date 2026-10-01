/**
 * BasicInfoPanel.tsx
 *
 * Configuration panel for basic tournament info: name, description, game, dates.
 * Independent isDirty state with Save button.
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Globe, MapPin } from 'lucide-react';
import { CommandHeader, CommandSection } from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChoiceCard, ChoiceGroup, CONTROL_CLASS, Field, FORM_MEASURE_CLASS } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import { PanelSaveBar } from '../PanelSaveBar';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

const REGIONS = [
  { value: '', label: 'Choose a region' },
  { value: 'na-east', label: 'North America East' },
  { value: 'na-west', label: 'North America West' },
  { value: 'latam', label: 'Latin America' },
  { value: 'eu', label: 'Europe' },
  { value: 'me', label: 'Middle East' },
  { value: 'sea', label: 'Southeast Asia' },
  { value: 'oce', label: 'Oceania' },
  { value: 'africa', label: 'Africa' },
  { value: 'global', label: 'Global / Online' },
];

interface BasicInfoPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

interface FormState {
  name: string;
  description: string;
  rules: string;
  startDate: string;
  endDate: string;
  region: string;
  isOnline: boolean;
  venueAddress: string;
}

function toDatetimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export function BasicInfoPanel({ tournament, editableFields, onSave }: BasicInfoPanelProps) {
  const { toast } = useToast();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);

  const initialState: FormState = {
    name: tournament.name || '',
    description: tournament.description || '',
    rules: tournament.rules ?? '',
    startDate: toDatetimeLocal(tournament.start_date),
    endDate: toDatetimeLocal(tournament.end_date),
    region: tournament.region || '',
    isOnline: !tournament.venue_address,
    venueAddress: tournament.venue_address ?? '',
  };

  const [form, setForm] = useState<FormState>(initialState);
  const resetForm = () => setForm({
    name: tournament.name || '',
    description: tournament.description || '',
    rules: tournament.rules ?? '',
    startDate: toDatetimeLocal(tournament.start_date),
    endDate: toDatetimeLocal(tournament.end_date),
    region: tournament.region || '',
    isOnline: !tournament.venue_address,
    venueAddress: tournament.venue_address ?? '',
  });

  // Reset form when tournament changes
  useEffect(() => {
    resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]);

  const isDirty =
    form.name !== (tournament.name || '') ||
    form.description !== (tournament.description || '') ||
    form.rules !== (tournament.rules ?? '') ||
    form.startDate !== toDatetimeLocal(tournament.start_date) ||
    form.endDate !== toDatetimeLocal(tournament.end_date) ||
    form.region !== (tournament.region || '') ||
    form.isOnline !== !tournament.venue_address ||
    form.venueAddress !== (tournament.venue_address ?? '');

  // Signal shell so the dirty-state guard can intercept nav changes
  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  const isFieldLocked = (field: string) => {
    return !editableFields.has('*') && !editableFields.has(field);
  };

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        name: form.name.trim() || undefined,
        description: form.description.trim() || undefined,
        rules: form.rules.trim() || undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        region: form.region.trim() || undefined,
        venueAddress: form.isOnline ? undefined : (form.venueAddress.trim() || undefined),
        clearVenueAddress: form.isOnline,
      });
      toast({ title: 'Saved', description: 'Players see the new details straight away.' });
      onSave();
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, toast, onSave]);

  const lockNote = 'Locked once the tournament is live.';

  return (
    <>
      <CommandHeader eyebrow="Configure" title="Basic info" description="The name, description, dates and region players see on the listing and tournament page." />

      <CommandSection>
        <div className={cn(FORM_MEASURE_CLASS, 'space-y-5')}>
          <Field label="Tournament name" htmlFor="bi-name" hint="Shown on the listing, the bracket and every match page." lockedReason={isFieldLocked('name') ? lockNote : undefined}>
            <Input id="bi-name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              disabled={isFieldLocked('name')} placeholder="e.g. Karachi Winter Cup" className={CONTROL_CLASS} />
          </Field>

          <Field label="Description" htmlFor="bi-description" hint="What's at stake, who it's for and anything players must know before signing up." lockedReason={isFieldLocked('description') ? lockNote : undefined}>
            <Textarea id="bi-description" value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              disabled={isFieldLocked('description')} placeholder="Five-stack cup for teams across Pakistan…" rows={5}
              className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm leading-relaxed')} />
          </Field>

          <Field label="Rules" htmlFor="bi-rules" hint="Optional. Shown on the tournament page.">
            <Textarea id="bi-rules" value={form.rules} onChange={(e) => setForm((s) => ({ ...s, rules: e.target.value }))}
              placeholder="e.g. No subs after round 2. Screenshots required for disputes…" rows={5}
              className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm leading-relaxed')} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Starts" htmlFor="bi-start" hint="Your local time." lockedReason={isFieldLocked('start_date') ? lockNote : undefined}>
              <Input id="bi-start" type="datetime-local" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                disabled={isFieldLocked('start_date')} className={CONTROL_CLASS} />
            </Field>
            <Field label="Ends" htmlFor="bi-end" optional lockedReason={isFieldLocked('end_date') ? lockNote : undefined}>
              <Input id="bi-end" type="datetime-local" value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                disabled={isFieldLocked('end_date')} className={CONTROL_CLASS} />
            </Field>
          </div>

          <Field label="Region" htmlFor="bi-region" hint="The server region players connect to, or where the event takes place." lockedReason={isFieldLocked('region') ? lockNote : undefined}>
            <div className="relative max-w-sm">
              <select id="bi-region" value={form.region} onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))} disabled={isFieldLocked('region')}
                className={cn(CONTROL_CLASS, 'w-full appearance-none border px-3 pr-8 text-sm')}>
                {REGIONS.map((r) => <option key={r.value} value={r.value} className="bg-zinc-900">{r.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
            </div>
          </Field>

          <Field label="Where it's played">
            <ChoiceGroup label="Where it's played" columns={2}>
              <ChoiceCard
                selected={form.isOnline}
                onSelect={() => setForm((s) => ({ ...s, isOnline: true }))}
                icon={<Globe className="h-5 w-5" aria-hidden />}
                title="Online"
                description="Players join from home."
              />
              <ChoiceCard
                selected={!form.isOnline}
                onSelect={() => setForm((s) => ({ ...s, isOnline: false }))}
                icon={<MapPin className="h-5 w-5" aria-hidden />}
                title="LAN"
                description="Everyone plays at one venue."
              />
            </ChoiceGroup>
            {!form.isOnline && (
              <Field label="Venue address" htmlFor="bi-venue" optional hint="You can add it later if the venue isn't booked yet.">
                <Input
                  id="bi-venue"
                  placeholder="Street, city"
                  value={form.venueAddress}
                  onChange={(e) => setForm((s) => ({ ...s, venueAddress: e.target.value }))}
                  className={CONTROL_CLASS}
                />
              </Field>
            )}
          </Field>

          <Field label="Game" lockedReason={isFieldLocked("game") ? "The game is locked once a tournament is created." : undefined}>
            <p className="text-sm text-zinc-200">{tournament.game || 'Not set'}</p>
          </Field>
        </div>
      </CommandSection>

      <PanelSaveBar isDirty={isDirty} saving={saving} onSave={handleSave} onDiscard={resetForm} />
    </>
  );
}
