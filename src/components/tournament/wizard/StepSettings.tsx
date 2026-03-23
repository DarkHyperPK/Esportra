import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Zap, Swords } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { WizardStepProps } from '@/types/tournamentWizard';

const StepSettings: React.FC<WizardStepProps> = ({ data, updateData }) => {
    const isValorant = data.game?.toLowerCase() === 'valorant';

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
        >
            <div>
                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">
                    <Settings className="w-4 h-4" />
                    Tournament Settings
                </Label>

                <div className="space-y-4">
                    {/* Map Veto Toggle */}
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <Switch
                            checked={data.mapVetoEnabled}
                            onCheckedChange={(checked) => updateData({ mapVetoEnabled: checked })}
                        />
                        <div className="flex-1">
                            <p className="font-medium text-white text-sm flex items-center gap-2">
                                <Swords className="w-4 h-4 text-zinc-400" />
                                Enable Map Veto
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Teams must complete a map ban/pick phase before reporting match results.
                                Disable this for games without map selection.
                            </p>
                        </div>
                    </div>

                    {/* Assisted Match Reporting - Valorant only */}
                    {isValorant && (
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <Switch
                                checked={data.assistedMatchReporting}
                                onCheckedChange={(checked) => updateData({ assistedMatchReporting: checked })}
                            />
                            <div className="flex-1">
                                <p className="font-medium text-white text-sm flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-zinc-400" />
                                    Assisted Match Reporting
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Automatically detects match results from Riot's API. Captains can scan their recent matches to report scores instantly.
                                </p>
                                {data.assistedMatchReporting && (
                                    <p className="text-xs text-amber-400 mt-2">
                                        ⚠ Players will be required to link their Riot account before registering.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default StepSettings;
