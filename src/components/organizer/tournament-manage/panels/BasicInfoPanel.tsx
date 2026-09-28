/**
 * BasicInfoPanel.tsx
 *
 * Configuration panel for basic tournament info: name, description, game, dates.
 * Independent isDirty state with Save button.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

const REGIONS = [
  { value: '', label: 'Select region…' },
  { value: 'na-east', label: 'NA East' },
  { value: 'na-west', label: 'NA West' },
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
  startDate: string;
  endDate: string;
  region: string;
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
    startDate: toDatetimeLocal(tournament.start_date),
    endDate: toDatetimeLocal(tournament.end_date),
    region: tournament.region || '',
  };

  const [form, setForm] = useState<FormState>(initialState);

  // Reset form when tournament changes
  useEffect(() => {
    setForm({
      name: tournament.name || '',
      description: tournament.description || '',
      startDate: toDatetimeLocal(tournament.start_date),
      endDate: toDatetimeLocal(tournament.end_date),
      region: tournament.region || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]);

  const isDirty =
    form.name !== (tournament.name || '') ||
    form.description !== (tournament.description || '') ||
    form.startDate !== toDatetimeLocal(tournament.start_date) ||
    form.endDate !== toDatetimeLocal(tournament.end_date) ||
    form.region !== (tournament.region || '');

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
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        region: form.region.trim() || undefined,
      });
      toast({ title: 'Basic info saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, toast, onSave]);

  return (
    <>
      <CommandHeader eyebrow="CONFIGURATION" title="Basic Info" description="Tournament name, description, and scheduling dates." />

      <CommandSection>
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Tournament Name
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              disabled={isFieldLocked('name')}
              placeholder="Enter tournament name"
              className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              disabled={isFieldLocked('description')}
              placeholder="Describe your tournament..."
              rows={4}
              className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
            />
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Start Date
              </Label>
              <Input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                disabled={isFieldLocked('start_date')}
                className="border-white/10 bg-black/30 text-white disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                End Date
              </Label>
              <Input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))}
                disabled={isFieldLocked('end_date')}
                className="border-white/10 bg-black/30 text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Region */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Region
            </Label>
            <div className="relative max-w-sm">
              <select
                value={form.region}
                onChange={(e) => setForm((s) => ({ ...s, region: e.target.value }))}
                disabled={isFieldLocked('region')}
                className="w-full appearance-none border border-white/10 bg-black/30 px-3 py-2 pr-8 text-sm text-white focus:border-rose-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-zinc-900">{r.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>

          {/* Game (read-only after publish) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Game
            </Label>
            <div className="px-0 py-1.5 font-mono text-sm text-zinc-400">
              {tournament.game || 'Not set'}
              {isFieldLocked('game') && (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                  — Locked after publish
                </span>
              )}
            </div>
          </div>
        </div>
      </CommandSection>

      <CommandActionBar>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-label="Unsaved changes" />
          )}
          <CommandButton
            onClick={handleSave}
            disabled={!isDirty || saving}
            variant="primary"
            size="sm"
            slide
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </CommandButton>
        </div>
      </CommandActionBar>
    </>
  );
}
