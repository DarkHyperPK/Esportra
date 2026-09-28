/**
 * RegistrationPanel.tsx
 *
 * Configuration panel for registration settings.
 * Owns ALL check-in controls (toggle, level, window, deadline, auto-remove) + invite slots.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Info } from 'lucide-react';
import {
  CommandHeader,
  CommandSection,
  CommandActionBar,
  CommandButton,
} from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">
          <Info className="h-3 w-3 text-zinc-600 hover:text-zinc-400 transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[200px] border-white/10 bg-[#0d0d0f] text-[11px] text-zinc-300"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

type CheckInLevel = 'none' | 'tournament' | 'match' | 'both';

const CHECK_IN_OPTIONS: { value: CheckInLevel; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No check-in required' },
  { value: 'tournament', label: 'Tournament', description: 'Players check in once before tournament starts' },
  { value: 'match', label: 'Match', description: 'Players check in before each individual match' },
  { value: 'both', label: 'Both', description: 'Tournament-level and per-match check-in required' },
];

interface RegistrationPanelProps {
  tournament: DashboardTournament;
  editableFields: Set<string>;
  onSave: () => void;
}

interface FormState {
  maxTeams: number;
  registrationDeadline: string;
  checkInLevel: CheckInLevel;
  checkInWindowMinutes: number;
  checkInDeadline: string;
  autoRemoveUnchecked: boolean;
  invitedTeamsEnabled: boolean;
  reservedInviteSlots: number;
  inviteExpiryDays: number;
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

function resolveCheckInLevel(t: DashboardTournament): CheckInLevel {
  if (t.settings?.checkInLevel) return t.settings.checkInLevel as CheckInLevel;
  if (t.check_in_required) return 'tournament';
  return 'none';
}

export function RegistrationPanel({ tournament, editableFields, onSave }: RegistrationPanelProps) {
  const { toast } = useToast();
  const { setDirty } = useDirtyState();
  const [saving, setSaving] = useState(false);

  const getInitial = (t: DashboardTournament): FormState => ({
    maxTeams: t.max_teams ?? 0,
    registrationDeadline: toDatetimeLocal(t.registration_deadline),
    checkInLevel: resolveCheckInLevel(t),
    checkInWindowMinutes: t.settings?.checkInWindowMinutes ?? t.check_in_window_minutes ?? 30,
    checkInDeadline: toDatetimeLocal(t.check_in_deadline),
    autoRemoveUnchecked: t.auto_remove_unchecked ?? false,
    invitedTeamsEnabled: t.settings?.invitedTeamsEnabled ?? (t.reserved_invite_slots ?? 0) > 0,
    reservedInviteSlots: t.reserved_invite_slots ?? 0,
    inviteExpiryDays: t.invite_expiry_days ?? 7,
  });

  const [form, setForm] = useState<FormState>(() => getInitial(tournament));

  useEffect(() => {
    setForm(getInitial(tournament));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournament.id, tournament.updated_at]);

  const initial = getInitial(tournament);
  const isDirty =
    form.maxTeams !== initial.maxTeams ||
    form.registrationDeadline !== initial.registrationDeadline ||
    form.checkInLevel !== initial.checkInLevel ||
    form.checkInWindowMinutes !== initial.checkInWindowMinutes ||
    form.checkInDeadline !== initial.checkInDeadline ||
    form.autoRemoveUnchecked !== initial.autoRemoveUnchecked ||
    form.invitedTeamsEnabled !== initial.invitedTeamsEnabled ||
    form.reservedInviteSlots !== initial.reservedInviteSlots ||
    form.inviteExpiryDays !== initial.inviteExpiryDays;

  useEffect(() => {
    setDirty(isDirty);
    return () => setDirty(false);
  }, [isDirty, setDirty]);

  const isFieldLocked = (field: string) => !editableFields.has('*') && !editableFields.has(field);

  const checkInEnabled = form.checkInLevel !== 'none';

  const handleSave = useCallback(async () => {
    if (!isDirty || saving) return;
    setSaving(true);
    try {
      await apiClient.put(`/api/tournaments/${tournament.id}`, {
        maxTeams: form.maxTeams > 0 ? form.maxTeams : undefined,
        registrationDeadline: form.registrationDeadline
          ? new Date(form.registrationDeadline).toISOString()
          : undefined,
        checkInRequired: checkInEnabled,
        checkInDeadline: form.checkInDeadline
          ? new Date(form.checkInDeadline).toISOString()
          : null,
        autoRemoveUnchecked: form.autoRemoveUnchecked,
        reservedInviteSlots: form.invitedTeamsEnabled ? form.reservedInviteSlots : 0,
        inviteExpiryDays: form.inviteExpiryDays,
        settings: {
          ...tournament.settings,
          checkInLevel: form.checkInLevel,
          checkInWindowMinutes: form.checkInWindowMinutes,
          invitedTeamsEnabled: form.invitedTeamsEnabled,
        },
      });
      toast({ title: 'Registration settings saved' });
      onSave();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, checkInEnabled, tournament, toast, onSave]);

  return (
    <TooltipProvider delayDuration={300}>
      <CommandHeader
        eyebrow="CONFIGURATION"
        title="Registration"
      />

      <CommandSection>
        <div className="space-y-5">
          {/* Capacity */}
          <div className="space-y-4">
            <p className="border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">CAPACITY</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Max Participants
                </Label>
                <InfoTip text="Set to 0 for unlimited participants." />
              </div>
              <Input
                type="number"
                min={0}
                value={form.maxTeams === 0 ? '' : form.maxTeams}
                onChange={(e) =>
                  setForm((s) => ({ ...s, maxTeams: parseInt(e.target.value, 10) || 0 }))
                }
                disabled={isFieldLocked('max_teams')}
                placeholder="No limit"
                className="max-w-[200px] border-white/10 bg-black/30 text-white placeholder:text-zinc-600 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
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
                className="max-w-[280px] border-white/10 bg-black/30 text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Check-In */}
          <div className="space-y-3">
            <p className="border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">CHECK-IN</p>

            <div>
              <p className="mb-2 text-[11px] font-semibold text-zinc-300">Check-In Level</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {CHECK_IN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, checkInLevel: opt.value }))}
                    disabled={isFieldLocked('check_in_required')}
                    className={`flex items-center gap-2 border px-3 py-2.5 text-left transition-all disabled:pointer-events-none disabled:opacity-50 ${
                      form.checkInLevel === opt.value
                        ? 'border-rose-500/40 bg-rose-500/[0.06] text-white'
                        : 'border-white/[0.07] bg-white/[0.02] text-zinc-400 hover:border-white/15 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-semibold">{opt.label}</span>
                    <InfoTip text={opt.description} />
                  </button>
                ))}
              </div>
            </div>

            <div className={`space-y-3 ${!checkInEnabled ? 'opacity-40 pointer-events-none' : ''}`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Check-In Window
                  </Label>
                  <InfoTip text="Minutes before match start that check-in opens." />
                </div>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={form.checkInWindowMinutes}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, checkInWindowMinutes: parseInt(e.target.value, 10) || 30 }))
                  }
                  className="max-w-[120px] border-white/10 bg-black/30 text-white disabled:opacity-50"
                />
                <p className="text-[10px] text-zinc-600">minutes before match</p>
              </div>

              <div className="space-y-1.5">
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
                  className="max-w-[280px] border-white/10 bg-black/30 text-white disabled:opacity-50"
                />
              </div>

              <div className="border border-white/[0.06] bg-white/[0.01]">
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-white">Auto-Remove Unchecked</p>
                    <InfoTip text="Automatically remove participants who miss the check-in deadline." />
                  </div>
                  <Switch
                    checked={form.autoRemoveUnchecked}
                    onCheckedChange={(checked) =>
                      setForm((s) => ({ ...s, autoRemoveUnchecked: checked }))
                    }
                    disabled={isFieldLocked('auto_remove_unchecked')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invites */}
          <div className="space-y-3">
            <p className="border-b border-white/[0.05] pb-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-rose-500/60">INVITES</p>

            <div className="border border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-center justify-between px-3 py-3">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white">Invited Teams</p>
                  <InfoTip text="Reserve slots for teams invited directly by the organizer." />
                </div>
                <Switch
                  checked={form.invitedTeamsEnabled}
                  onCheckedChange={(checked) =>
                    setForm((s) => ({ ...s, invitedTeamsEnabled: checked }))
                  }
                />
              </div>
            </div>

            {form.invitedTeamsEnabled && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Reserved Invite Slots
                    </Label>
                    <InfoTip text="Number of slots reserved exclusively for invited teams." />
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={1024}
                    value={form.reservedInviteSlots}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, reservedInviteSlots: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="max-w-[140px] border-white/10 bg-black/30 text-white disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Invite Expiry Days
                    </Label>
                    <InfoTip text="Days before an invitation expires." />
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.inviteExpiryDays}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, inviteExpiryDays: parseInt(e.target.value, 10) || 7 }))
                    }
                    className="max-w-[140px] border-white/10 bg-black/30 text-white disabled:opacity-50"
                  />
                </div>
              </div>
            )}
          </div>
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
    </TooltipProvider>
  );
}
