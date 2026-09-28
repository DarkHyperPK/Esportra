/**
 * RegistrationPanel.tsx
 *
 * Configuration panel for registration settings.
 * Max teams, registration type, dates, check-in config.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

interface RegistrationPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

interface FormState {
  maxTeams: number;
  registrationDeadline: string;
  checkInRequired: boolean;
  checkInDeadline: string;
  autoRemoveUnchecked: boolean;
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

export function RegistrationPanel({ tournament, editableFields, onSave }: RegistrationPanelProps) {
  const { toast } = useToast();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>({
    maxTeams: tournament.max_teams ?? 0,
    registrationDeadline: toDatetimeLocal(tournament.registration_deadline),
    checkInRequired: tournament.check_in_required ?? false,
    checkInDeadline: toDatetimeLocal(tournament.check_in_deadline),
    autoRemoveUnchecked: tournament.auto_remove_unchecked ?? false,
  });

  useEffect(() => {
    setForm({
      maxTeams: tournament.max_teams ?? 0,
      registrationDeadline: toDatetimeLocal(tournament.registration_deadline),
      checkInRequired: tournament.check_in_required ?? false,
      checkInDeadline: toDatetimeLocal(tournament.check_in_deadline),
      autoRemoveUnchecked: tournament.auto_remove_unchecked ?? false,
    });
  }, [tournament.id, tournament.updated_at]);

  const isDirty =
    form.maxTeams !== (tournament.max_teams ?? 0) ||
    form.registrationDeadline !== toDatetimeLocal(tournament.registration_deadline) ||
    form.checkInRequired !== (tournament.check_in_required ?? false) ||
    form.checkInDeadline !== toDatetimeLocal(tournament.check_in_deadline) ||
    form.autoRemoveUnchecked !== (tournament.auto_remove_unchecked ?? false);

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  const isFieldLocked = (field: string) => !editableFields.has('*') && !editableFields.has(field);

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        maxTeams: form.maxTeams > 0 ? form.maxTeams : undefined,
        registrationDeadline: form.registrationDeadline
          ? new Date(form.registrationDeadline).toISOString()
          : undefined,
        checkInRequired: form.checkInRequired,
        checkInDeadline: form.checkInDeadline
          ? new Date(form.checkInDeadline).toISOString()
          : null,
        autoRemoveUnchecked: form.autoRemoveUnchecked,
      });
      toast({ title: 'Registration settings saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, tournament.id, toast, onSave]);

  return (
    <>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Registration"
        description="Configure participant capacity, deadlines, and check-in requirements."
      />

      <CommandSection>
        <div className="space-y-6">
          {/* Max Teams */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Max Participants
            </Label>
            <Input
              type="number"
              min={0}
              value={form.maxTeams === 0 ? '' : form.maxTeams}
              onChange={(e) =>
                setForm((s) => ({ ...s, maxTeams: parseInt(e.target.value, 10) || 0 }))
              }
              disabled={isFieldLocked('max_teams')}
              placeholder="No limit"
              className="border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50 max-w-[200px]"
            />
            <p className="text-xs text-zinc-500">Set to 0 for unlimited participants.</p>
          </div>

          {/* Registration Deadline */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Registration Deadline
            </Label>
            <Input
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(e) =>
                setForm((s) => ({ ...s, registrationDeadline: e.target.value }))
              }
              disabled={isFieldLocked('registration_deadline')}
              className="border-white/10 bg-black/30 text-white disabled:opacity-50 max-w-[280px]"
            />
          </div>

          {/* Check-In Required */}
          <div className="flex items-center justify-between border border-white/10 bg-white/[0.02] p-4">
            <div>
              <p className="text-sm font-medium text-white">Require Check-In</p>
              <p className="text-xs text-zinc-500">
                Participants must check in before the tournament starts.
              </p>
            </div>
            <Switch
              checked={form.checkInRequired}
              onCheckedChange={(checked) =>
                setForm((s) => ({ ...s, checkInRequired: checked }))
              }
              disabled={isFieldLocked('check_in_required')}
            />
          </div>

          {/* Check-In Deadline (shown when check-in is required) */}
          {form.checkInRequired && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Check-In Deadline
              </Label>
              <Input
                type="datetime-local"
                value={form.checkInDeadline}
                onChange={(e) =>
                  setForm((s) => ({ ...s, checkInDeadline: e.target.value }))
                }
                disabled={isFieldLocked('check_in_deadline')}
                className="border-white/10 bg-black/30 text-white disabled:opacity-50 max-w-[280px]"
              />
            </div>
          )}

          {/* Auto-remove unchecked */}
          {form.checkInRequired && (
            <div className="flex items-center justify-between border border-white/10 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm font-medium text-white">Auto-Remove Unchecked</p>
                <p className="text-xs text-zinc-500">
                  Automatically remove participants who miss the check-in deadline.
                </p>
              </div>
              <Switch
                checked={form.autoRemoveUnchecked}
                onCheckedChange={(checked) =>
                  setForm((s) => ({ ...s, autoRemoveUnchecked: checked }))
                }
                disabled={isFieldLocked('auto_remove_unchecked')}
              />
            </div>
          )}
        </div>
      </CommandSection>

      <CommandActionBar>
        <div className="flex items-center gap-3">
          {isDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
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
