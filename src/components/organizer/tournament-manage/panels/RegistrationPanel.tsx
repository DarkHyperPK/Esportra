/**
 * RegistrationPanel.tsx
 *
 * Configuration panel for registration settings.
 * Owns ALL check-in controls (toggle, level, window, deadline, auto-remove) + invite slots.
 */

import { useState, useEffect, useCallback } from 'react';
import { CommandHeader, CommandSection } from '@/components/management/CommandSurface';
import { Input } from '@/components/ui/input';
import { ChoiceCard, ChoiceGroup, CONTROL_CLASS, Field, FormSection, FORM_MEASURE_CLASS, ToggleRow } from '@/components/ui/kit';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useDirtyState } from '@/components/organizer/tournament-manage/TournamentDashboardShell';
import type { DashboardTournament } from '@/hooks/useTournamentDashboard';
import { PanelSaveBar } from '../PanelSaveBar';

type CheckInLevel = 'none' | 'tournament' | 'match' | 'both';

const CHECK_IN_OPTIONS: { value: CheckInLevel; label: string; description: string }[] = [
  { value: 'none', label: 'No check-in', description: 'Everyone registered is expected to show up.' },
  { value: 'tournament', label: 'Once, before start', description: 'Teams confirm once. No-shows are caught before seeding.' },
  { value: 'match', label: 'Before every match', description: 'Both teams confirm before each match can begin.' },
  { value: 'both', label: 'Both', description: 'Once before start, and again before every match.' },
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

  const resetForm = () => setForm(getInitial(tournament));

  useEffect(() => {
    resetForm();
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
      toast({ title: 'Saved', description: 'Registration rules updated.' });
      onSave();
    } catch (err: any) {
      toast({ title: "Couldn't save", description: err.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [isDirty, saving, form, checkInEnabled, tournament, toast, onSave]);

  const lockNote = 'Locked once the tournament is live.';
  const openSpots = form.maxTeams > 0 ? Math.max(form.maxTeams - (form.invitedTeamsEnabled ? form.reservedInviteSlots : 0), 0) : null;

  return (
    <>
      <CommandHeader
        eyebrow="Configure"
        title="Registration"
        description="How many can sign up, until when, whether they confirm before playing, and spots held for invites."
      />

      <CommandSection>
        <div className={cn(FORM_MEASURE_CLASS)}>
          <FormSection title="Capacity and deadline">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Maximum teams" htmlFor="rg-max" hint="Leave empty for no limit." lockedReason={isFieldLocked('max_teams') ? lockNote : undefined}>
                <Input id="rg-max" type="number" min={0} value={form.maxTeams === 0 ? '' : form.maxTeams} placeholder="No limit"
                  onChange={(e) => setForm((s) => ({ ...s, maxTeams: parseInt(e.target.value, 10) || 0 }))}
                  disabled={isFieldLocked('max_teams')} className={CONTROL_CLASS} />
              </Field>
              <Field label="Registration closes" htmlFor="rg-deadline" hint="Leave time to seed the bracket before the start." lockedReason={isFieldLocked('registration_deadline') ? lockNote : undefined}>
                <Input id="rg-deadline" type="datetime-local" value={form.registrationDeadline}
                  onChange={(e) => setForm((s) => ({ ...s, registrationDeadline: e.target.value }))}
                  disabled={isFieldLocked('registration_deadline')} className={CONTROL_CLASS} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Check-in" description="Catch no-shows before they leave holes in the bracket.">
            <ChoiceGroup label="Check-in" columns={2}>
              {CHECK_IN_OPTIONS.map((opt) => (
                <ChoiceCard key={opt.value} selected={form.checkInLevel === opt.value} disabled={isFieldLocked('check_in_required')}
                  onSelect={() => setForm((s) => ({ ...s, checkInLevel: opt.value }))} title={opt.label} description={opt.description} />
              ))}
            </ChoiceGroup>
            {checkInEnabled && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Check-in opens" htmlFor="rg-window" hint="Minutes before the start (or each match). 5 to 120.">
                    <Input id="rg-window" type="number" min={5} max={120} value={form.checkInWindowMinutes}
                      onChange={(e) => setForm((s) => ({ ...s, checkInWindowMinutes: parseInt(e.target.value, 10) || 30 }))}
                      className={cn(CONTROL_CLASS, 'w-32')} />
                  </Field>
                  <Field label="Check-in closes" htmlFor="rg-ci-deadline" optional hint="Defaults to the start time." lockedReason={isFieldLocked('check_in_deadline') ? lockNote : undefined}>
                    <Input id="rg-ci-deadline" type="datetime-local" value={form.checkInDeadline}
                      onChange={(e) => setForm((s) => ({ ...s, checkInDeadline: e.target.value }))}
                      disabled={isFieldLocked('check_in_deadline')} className={CONTROL_CLASS} />
                  </Field>
                </div>
                <ToggleRow id="rg-auto-remove" title="Remove no-shows automatically"
                  description="Teams that haven't checked in when it closes are dropped from the bracket."
                  checked={form.autoRemoveUnchecked} disabled={isFieldLocked('auto_remove_unchecked')}
                  onCheckedChange={(checked) => setForm((s) => ({ ...s, autoRemoveUnchecked: checked }))} />
              </>
            )}
          </FormSection>

          <FormSection title="Invited teams">
            <ToggleRow id="rg-invites" title="Hold spots for invited teams"
              description="Guaranteed places you fill by emailing invite codes from Invitations."
              checked={form.invitedTeamsEnabled} onCheckedChange={(checked) => setForm((s) => ({ ...s, invitedTeamsEnabled: checked }))}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Spots held" htmlFor="rg-reserved">
                  <Input id="rg-reserved" type="number" min={0} max={1024} value={form.reservedInviteSlots}
                    onChange={(e) => setForm((s) => ({ ...s, reservedInviteSlots: parseInt(e.target.value, 10) || 0 }))}
                    className={cn(CONTROL_CLASS, 'w-32')} />
                </Field>
                <Field label="Codes expire after" htmlFor="rg-expiry" hint="Days. 1 to 365.">
                  <Input id="rg-expiry" type="number" min={1} max={365} value={form.inviteExpiryDays}
                    onChange={(e) => setForm((s) => ({ ...s, inviteExpiryDays: parseInt(e.target.value, 10) || 7 }))}
                    className={cn(CONTROL_CLASS, 'w-32')} />
                </Field>
              </div>
              {openSpots !== null && (
                <p className="text-[13px] text-zinc-400">
                  <span className="font-semibold text-white">{form.reservedInviteSlots}</span> held for invites, <span className="font-semibold text-white">{openSpots}</span> open to everyone.
                </p>
              )}
            </ToggleRow>
          </FormSection>
        </div>
      </CommandSection>

      <PanelSaveBar isDirty={isDirty} saving={saving} onSave={handleSave} onDiscard={resetForm} />
    </>
  );
}
