import React, { useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { CONTROL_CLASS, CONTROL_ERROR_CLASS, Field, FormSection, InlineNotice, Timeline, ToggleRow } from '@/components/ui/kit';
import { WizardStepProps, type TournamentWizardData } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';
import { getInviteParticipantLabel } from '@/utils/tournamentInviteUtils';
import { toLocalDateTimeInputValue } from '@/utils/tournamentLifecycle';
import { WizardStepFrame } from './WizardStepFrame';

const when = (value: Date) => value.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const StepRegistration: React.FC<WizardStepProps> = ({ data, updateData, errors, isEditMode, activeInvitationCount = 0 }) => {
    const noun = getInviteParticipantLabel(data.teamSize);
    const reserved = data.invitedTeamsEnabled ? data.reservedInviteSlots : 0;
    const openSlots = data.maxTeams > 0 ? Math.max(data.maxTeams - reserved, 0) : null;
    const invitesLocked = Boolean(isEditMode && activeInvitationCount > 0);

    const handleInvitedTeamsToggle = (enabled: boolean) => {
        if (!enabled) {
            if (invitesLocked) return;
            updateData({ invitedTeamsEnabled: false, reservedInviteSlots: 0 });
            return;
        }
        const defaultSlots = data.maxTeams > 0 ? Math.min(Math.max(2, Math.floor(data.maxTeams / 4)), data.maxTeams) : 4;
        updateData({ invitedTeamsEnabled: true, reservedInviteSlots: data.reservedInviteSlots > 0 ? data.reservedInviteSlots : defaultSlots });
    };

    const getDefaultRegistrationOpen = useCallback(() => new Date().toISOString().split('T')[0] + 'T00:00', []);
    const getDefaultRegistrationClose = useCallback(() => {
        if (!data.startDate) return '';
        const closeDate = new Date(`${data.startDate}T${data.startTime || '00:00'}`);
        closeDate.setDate(closeDate.getDate() - 1);
        closeDate.setHours(23, 59, 0, 0);
        return toLocalDateTimeInputValue(closeDate);
    }, [data.startDate, data.startTime]);

    useEffect(() => {
        const updates: Partial<TournamentWizardData> = {};
        if (!data.registrationOpens) updates.registrationOpens = getDefaultRegistrationOpen();
        if (!data.registrationCloses && data.startDate) updates.registrationCloses = getDefaultRegistrationClose();
        if (Object.keys(updates).length > 0) updateData(updates);
    }, [data.startDate, data.startTime, data.registrationOpens, data.registrationCloses, updateData, getDefaultRegistrationOpen, getDefaultRegistrationClose]);

    const start = data.startDate && data.startTime ? new Date(`${data.startDate}T${data.startTime}`) : null;
    const timeline = start ? [
        { label: 'Registration opens', value: 'As soon as it is published' },
        { label: 'Registration closes', value: data.registrationCloses ? when(new Date(data.registrationCloses)) : 'Not set' },
        ...(data.checkInRequired ? [{ label: 'Check-in opens', value: when(new Date(start.getTime() - data.checkInWindowMinutes * 60_000)) }] : []),
        { label: 'Tournament starts', value: when(start), emphasis: true },
    ] : null;

    return (
        <WizardStepFrame
            title="Sign-ups and check-in"
            description="When players can register, whether they need to confirm before start, and any spots you hold for invited teams."
        >
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_240px]">
                <div className="min-w-0">
                    <FormSection title="Registration deadline">
                        <Field
                            label="Registration closes"
                            htmlFor="registrationCloses"
                            hint="Defaults to the night before. Leave time to seed the bracket."
                            error={errors.registrationCloses}
                        >
                            <Input
                                id="registrationCloses"
                                type="datetime-local"
                                value={data.registrationCloses}
                                onChange={(e) => updateData({ registrationCloses: e.target.value })}
                                className={cn(CONTROL_CLASS, errors.registrationCloses && CONTROL_ERROR_CLASS)}
                            />
                        </Field>
                    </FormSection>

                    <FormSection title="Before it starts">
                        <ToggleRow
                            id="check-in"
                            title="Require check-in"
                            description="Teams confirm they're present shortly before start, so no-shows don't leave holes in the bracket."
                            checked={data.checkInRequired}
                            onCheckedChange={(checked) => updateData({ checkInRequired: checked, autoRemoveUnchecked: checked ? (data.autoRemoveUnchecked ?? true) : false })}
                        >
                            <Field label="Check-in opens" htmlFor="checkInWindow" hint="Minutes before the start time. Between 5 and 120.">
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="checkInWindow" type="number" min={5} max={120} value={data.checkInWindowMinutes}
                                        onChange={(e) => updateData({ checkInWindowMinutes: parseInt(e.target.value, 10) || 30 })}
                                        className={cn(CONTROL_CLASS, 'w-24')}
                                    />
                                    <span className="text-sm text-zinc-400">minutes before</span>
                                </div>
                            </Field>
                            <ToggleRow
                                id="auto-remove"
                                title="Remove no-shows automatically"
                                description="Teams that haven't checked in when the window closes are dropped from the bracket."
                                checked={data.autoRemoveUnchecked}
                                onCheckedChange={(checked) => updateData({ autoRemoveUnchecked: checked })}
                            />
                        </ToggleRow>
                    </FormSection>

                    <FormSection title="Invited teams">
                        <ToggleRow
                            id="invited-teams"
                            title={`Hold spots for invited ${noun}`}
                            description="Reserve guaranteed places. You email invite codes from the dashboard after the tournament is created."
                            checked={data.invitedTeamsEnabled}
                            onCheckedChange={handleInvitedTeamsToggle}
                            disabled={invitesLocked}
                        >
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label="Reserved spots" htmlFor="reservedInviteSlots" error={errors.reservedInviteSlots}>
                                    <Input
                                        id="reservedInviteSlots" type="number" min={Math.max(1, activeInvitationCount)} max={data.maxTeams > 0 ? data.maxTeams : 1024}
                                        value={data.reservedInviteSlots}
                                        onChange={(e) => updateData({ reservedInviteSlots: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                        className={cn(CONTROL_CLASS, errors.reservedInviteSlots && CONTROL_ERROR_CLASS)}
                                    />
                                </Field>
                                <Field label="Invite codes expire after" htmlFor="inviteExpiryDays" hint="Days. Between 1 and 365." error={errors.inviteExpiryDays}>
                                    <Input
                                        id="inviteExpiryDays" type="number" min={1} max={365} value={data.inviteExpiryDays}
                                        onChange={(e) => updateData({ inviteExpiryDays: Math.min(365, Math.max(1, parseInt(e.target.value, 10) || 7)) })}
                                        className={cn(CONTROL_CLASS, errors.inviteExpiryDays && CONTROL_ERROR_CLASS)}
                                    />
                                </Field>
                            </div>
                            <p className="text-[13px] text-zinc-400">
                                {openSlots !== null
                                    ? <><span className="font-semibold text-white">{data.reservedInviteSlots}</span> held for invites, <span className="font-semibold text-white">{openSlots}</span> open to everyone (of {data.maxTeams}).</>
                                    : <><span className="font-semibold text-white">{data.reservedInviteSlots}</span> held for invites. Set a maximum in the Format step to cap open sign-ups.</>}
                            </p>
                        </ToggleRow>
                        {invitesLocked && (
                            <InlineNotice tone="warning">
                                {activeInvitationCount} invitation{activeInvitationCount === 1 ? ' is' : 's are'} still active. Revoke {activeInvitationCount === 1 ? 'it' : 'them'} before turning this off or holding fewer spots.
                            </InlineNotice>
                        )}
                    </FormSection>
                </div>

                {timeline && (
                    <div className="md:pt-1">
                        <div className="md:sticky md:top-24">
                            <Timeline title="How it plays out" items={timeline} />
                        </div>
                    </div>
                )}
            </div>
        </WizardStepFrame>
    );
};

export default StepRegistration;
