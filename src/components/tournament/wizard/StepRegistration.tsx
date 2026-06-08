import React, { useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, UserCheck, Bell, Mail } from 'lucide-react';
import { WizardStepProps } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';
import { getInviteParticipantLabel } from '@/utils/tournamentInviteUtils';

const StepRegistration: React.FC<WizardStepProps> = ({
    data,
    updateData,
    errors,
    isEditMode,
    activeInvitationCount = 0,
}) => {
    const inviteParticipantLabel = getInviteParticipantLabel(data.teamSize);
    const openRegistrationSlots = data.maxTeams > 0
        ? Math.max(data.maxTeams - (data.invitedTeamsEnabled ? data.reservedInviteSlots : 0), 0)
        : null;

    const handleInvitedTeamsToggle = (enabled: boolean) => {
        if (!enabled) {
            if (isEditMode && activeInvitationCount > 0) return;
            updateData({ invitedTeamsEnabled: false, reservedInviteSlots: 0 });
            return;
        }

        const defaultSlots = data.maxTeams > 0
            ? Math.min(Math.max(2, Math.floor(data.maxTeams / 4)), data.maxTeams)
            : 4;

        updateData({
            invitedTeamsEnabled: true,
            reservedInviteSlots: data.reservedInviteSlots > 0 ? data.reservedInviteSlots : defaultSlots,
        });
    };
    const getDefaultRegistrationOpen = useCallback(() => {
        return new Date().toISOString().split('T')[0] + 'T00:00';
    }, []);

    const getDefaultRegistrationClose = useCallback(() => {
        if (!data.startDate) return '';
        const startDate = new Date(`${data.startDate}T${data.startTime || '00:00'}`);
        startDate.setDate(startDate.getDate() - 1);
        return startDate.toISOString().slice(0, 16);
    }, [data.startDate, data.startTime]);

    // Auto-set defaults and mandatory fields on mount
    useEffect(() => {
        const updates: Partial<any> = {};

        if (!data.registrationOpens) {
            updates.registrationOpens = getDefaultRegistrationOpen();
        }
        if (!data.registrationCloses && data.startDate) {
            updates.registrationCloses = getDefaultRegistrationClose();
        }

        // Enforce mandatory check-in fields
        if (!data.checkInRequired) {
            updates.checkInRequired = true;
        }
        if (!data.autoRemoveUnchecked) {
            updates.autoRemoveUnchecked = true;
        }

        if (Object.keys(updates).length > 0) {
            updateData(updates);
        }
    }, [data.startDate, data.startTime, data.registrationOpens, data.registrationCloses, data.checkInRequired, data.autoRemoveUnchecked, updateData, getDefaultRegistrationOpen, getDefaultRegistrationClose]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Registration Settings</h2>
                <p className="text-gray-400">Configure how players sign up and check in</p>
            </div>

            {/* Registration Period */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-4">
                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Calendar className="w-4 h-4" />
                    Registration Period
                </Label>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="registrationCloses" className="text-sm text-gray-400">
                            Registration Closes at *
                        </Label>
                        <Input
                            id="registrationCloses"
                            type="datetime-local"
                            value={data.registrationCloses}
                            onChange={(e) => updateData({ registrationCloses: e.target.value })}
                            className={cn(errors.registrationCloses && 'border-red-500', "font-bold tracking-tight")}
                        />
                        {errors.registrationCloses && (
                            <p className="text-sm text-red-500">{errors.registrationCloses}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Check-in Settings - Mandatory */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/10 space-y-4">
                <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                        <div className="font-medium text-white">Check-in Required</div>
                        <div className="text-sm text-gray-400">
                            Teams must confirm attendance before the tournament starts
                        </div>
                    </div>
                    <span className="ml-auto text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                        Mandatory
                    </span>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="space-y-2">
                        <Label htmlFor="checkInWindow" className="flex items-center gap-2 text-sm text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <Clock className="w-4 h-4" />
                            Check-in window (minutes before start)
                        </Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="checkInWindow"
                                type="number"
                                min={5}
                                max={120}
                                value={data.checkInWindowMinutes}
                                onChange={(e) => updateData({ checkInWindowMinutes: parseInt(e.target.value) || 30 })}
                                className="w-24 font-bold tracking-tight"
                            />
                            <span className="text-sm text-gray-400">minutes</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            Teams can check in starting {data.checkInWindowMinutes} minutes before the tournament starts
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-white text-sm">Auto-remove no-shows</div>
                            <div className="text-xs text-gray-400">
                                Automatically remove teams who don't check in
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                Mandatory
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full h-px bg-white/5 my-6" />
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/10 space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-rose-400 mt-0.5" />
                        <div>
                            <div className="font-medium text-white">Reserved slots for invited participants</div>
                            <div className="text-sm text-gray-400">
                                Hold guaranteed spots for email invites. You send invite codes from tournament management after creation.
                            </div>
                        </div>
                    </div>
                    <Switch
                        checked={data.invitedTeamsEnabled}
                        onCheckedChange={handleInvitedTeamsToggle}
                        disabled={isEditMode && activeInvitationCount > 0}
                        aria-label="Enable reserved invite slots"
                    />
                </div>
                {isEditMode && activeInvitationCount > 0 && (
                    <p className="text-xs text-amber-300">
                        {activeInvitationCount} active invitation{activeInvitationCount === 1 ? '' : 's'} — revoke them before disabling invited participants or lowering reserved slots below this count.
                    </p>
                )}

                {data.invitedTeamsEnabled && (
                    <div className="space-y-4 pt-4 border-t border-white/10">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reservedInviteSlots" className="text-sm text-gray-400">
                                            Reserved invite slots *
                                        </Label>
                                        <Input
                                            id="reservedInviteSlots"
                                            type="number"
                                            min={Math.max(1, activeInvitationCount)}
                                            max={data.maxTeams > 0 ? data.maxTeams : 1024}
                                            value={data.reservedInviteSlots}
                                            onChange={(e) => updateData({
                                                reservedInviteSlots: Math.max(0, parseInt(e.target.value, 10) || 0),
                                            })}
                                            className={cn(errors.reservedInviteSlots && 'border-red-500', 'font-bold tracking-tight')}
                                        />
                                        {errors.reservedInviteSlots && (
                                            <p className="text-sm text-red-500">{errors.reservedInviteSlots}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="inviteExpiryDays" className="text-sm text-gray-400">
                                            Invite code expiry (days)
                                        </Label>
                                        <Input
                                            id="inviteExpiryDays"
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={data.inviteExpiryDays}
                                            onChange={(e) => updateData({
                                                inviteExpiryDays: Math.min(365, Math.max(1, parseInt(e.target.value, 10) || 7)),
                                            })}
                                            className={cn(errors.inviteExpiryDays && 'border-red-500', 'font-bold tracking-tight')}
                                        />
                                        {errors.inviteExpiryDays && (
                                            <p className="text-sm text-red-500">{errors.inviteExpiryDays}</p>
                                        )}
                                    </div>
                                </div>

                        <p className="text-xs text-gray-500">
                            {data.maxTeams > 0 ? (
                                <>
                                    <span className="text-rose-400">{data.reservedInviteSlots}</span> invite slots reserved,{' '}
                                    <span className="text-emerald-400">{openRegistrationSlots}</span> open registration slots
                                    {' '}(max {data.maxTeams} {inviteParticipantLabel}).
                                </>
                            ) : (
                                <>
                                    <span className="text-rose-400">{data.reservedInviteSlots}</span> invite slots reserved.
                                    Set max {inviteParticipantLabel} in Format &amp; Rules to cap open registration.
                                </>
                            )}
                        </p>
                    </div>
                )}
            </div>

            {/* Summary Info */}
            {data.startDate && data.startTime && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="text-white font-medium">Timeline Summary</p>
                            <ul className="mt-2 space-y-1 text-gray-400">
                                <li>• Registration opens: Immediately</li>
                                <li>• Registration closes: {data.registrationCloses ? new Date(data.registrationCloses).toLocaleString() : 'Not set'}</li>
                                {data.checkInRequired && (
                                    <li>• Check-in starts: {data.checkInWindowMinutes} min before tournament</li>
                                )}
                                {data.invitedTeamsEnabled && (
                                    <li>• Invited participants: {data.reservedInviteSlots} reserved slot{data.reservedInviteSlots === 1 ? '' : 's'} (codes expire in {data.inviteExpiryDays} days)</li>
                                )}
                                <li>• Tournament starts: {new Date(`${data.startDate}T${data.startTime}`).toLocaleString()}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default StepRegistration;
