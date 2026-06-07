import React, { useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Calendar, Clock, UserCheck, Bell } from 'lucide-react';
import { WizardStepProps } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';

const StepRegistration: React.FC<WizardStepProps> = ({ data, updateData, errors }) => {
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
