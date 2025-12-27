import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import { Calendar, Clock, UserCheck, Users, Bell } from 'lucide-react';
import { WizardStepProps } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';

const StepRegistration: React.FC<WizardStepProps> = ({ data, updateData, errors }) => {
    // Calculate default dates based on start date
    const getDefaultRegistrationOpen = () => {
        return new Date().toISOString().split('T')[0] + 'T00:00';
    };

    const getDefaultRegistrationClose = () => {
        if (!data.startDate) return '';
        const startDate = new Date(`${data.startDate}T${data.startTime || '00:00'}`);
        startDate.setDate(startDate.getDate() - 1);
        return startDate.toISOString().slice(0, 16);
    };

    // Auto-set defaults on mount
    React.useEffect(() => {
        if (!data.registrationOpens) {
            updateData({ registrationOpens: getDefaultRegistrationOpen() });
        }
        if (!data.registrationCloses && data.startDate) {
            updateData({ registrationCloses: getDefaultRegistrationClose() });
        }
    }, [data.startDate]);

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
            <div className="space-y-4">
                <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Registration Period
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="registrationOpens" className="text-sm text-gray-400">
                            Opens at *
                        </Label>
                        <Input
                            id="registrationOpens"
                            type="datetime-local"
                            value={data.registrationOpens}
                            onChange={(e) => updateData({ registrationOpens: e.target.value })}
                            className={cn(errors.registrationOpens && 'border-red-500')}
                        />
                        {errors.registrationOpens && (
                            <p className="text-sm text-red-500">{errors.registrationOpens}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="registrationCloses" className="text-sm text-gray-400">
                            Closes at *
                        </Label>
                        <Input
                            id="registrationCloses"
                            type="datetime-local"
                            value={data.registrationCloses}
                            onChange={(e) => updateData({ registrationCloses: e.target.value })}
                            className={cn(errors.registrationCloses && 'border-red-500')}
                        />
                        {errors.registrationCloses && (
                            <p className="text-sm text-red-500">{errors.registrationCloses}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Check-in Settings */}
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-emerald-400" />
                        <div>
                            <div className="font-medium text-white">Require Check-in</div>
                            <div className="text-sm text-gray-400">
                                Players must confirm attendance before the tournament starts
                            </div>
                        </div>
                    </div>
                    <Switch
                        checked={data.checkInRequired}
                        onCheckedChange={(checked) => updateData({ checkInRequired: checked })}
                    />
                </div>

                {data.checkInRequired && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 border-t border-white/10"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="checkInWindow" className="flex items-center gap-2 text-sm">
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
                                    className="w-24"
                                />
                                <span className="text-sm text-gray-400">minutes</span>
                            </div>
                            <p className="text-xs text-gray-500">
                                Players can check in starting {data.checkInWindowMinutes} minutes before the tournament starts
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-white text-sm">Auto-remove unchecked</div>
                                <div className="text-xs text-gray-400">
                                    Automatically remove players who don't check in
                                </div>
                            </div>
                            <Switch
                                checked={data.autoRemoveUnchecked}
                                onCheckedChange={(checked) => updateData({ autoRemoveUnchecked: checked })}
                            />
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Waitlist Settings */}
            <div className="p-4 bg-white/[0.02] rounded-lg border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <div>
                            <div className="font-medium text-white">Enable Waitlist</div>
                            <div className="text-sm text-gray-400">
                                Allow players to join a waitlist when tournament is full
                            </div>
                        </div>
                    </div>
                    <Switch
                        checked={data.waitlistEnabled}
                        onCheckedChange={(checked) => updateData({ waitlistEnabled: checked })}
                    />
                </div>

                {data.waitlistEnabled && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pt-4 border-t border-white/10"
                    >
                        <Label htmlFor="waitlistMax" className="text-sm">Maximum waitlist size</Label>
                        <div className="flex items-center gap-3">
                            <Input
                                id="waitlistMax"
                                type="number"
                                min={1}
                                max={100}
                                value={data.waitlistMax}
                                onChange={(e) => updateData({ waitlistMax: parseInt(e.target.value) || 10 })}
                                className="w-24"
                            />
                            <span className="text-sm text-gray-400">teams</span>
                        </div>
                    </motion.div>
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
                                <li>• Registration opens: {data.registrationOpens ? new Date(data.registrationOpens).toLocaleString() : 'Not set'}</li>
                                <li>• Registration closes: {data.registrationCloses ? new Date(data.registrationCloses).toLocaleString() : 'Not set'}</li>
                                {data.checkInRequired && (
                                    <li>• Check-in starts: {data.checkInWindowMinutes} min before tournament</li>
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
