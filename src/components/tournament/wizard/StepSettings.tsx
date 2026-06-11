import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Zap, Swords, Server } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { WizardStepProps } from '@/types/tournamentWizard';
import { getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { useServerRegions, CONTINENT_LABELS } from '@/hooks/useServerRegions';

const StepSettings: React.FC<WizardStepProps> = ({ data, updateData }) => {
    const features = getEffectiveGameFeatures(data.game || '', data.gameMode);
    const showMapVeto = features.mapVeto;
    const showAssistedReporting = features.assistedReporting;
    const isCS2 = data.game?.toLowerCase() === 'counter-strike 2' || data.game?.toLowerCase() === 'cs2';
    const { data: regionGroups, isLoading: regionsLoading } = useServerRegions(isCS2);
    const hasAnySettings = showMapVeto || showAssistedReporting || isCS2;

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
                    {/* Map Veto Toggle — only for games with map veto */}
                    {showMapVeto && (
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
                            </p>
                        </div>
                    </div>
                    )}

                    {/* Assisted Match Reporting — games with API integration only */}
                    {showAssistedReporting && (
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

                    {/* Server Region — CS2 only */}
                    {isCS2 && (
                        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                            <Server className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="font-medium text-white text-sm">Game Server Region</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Select the server location closest to your players. A dedicated CS2 server will be automatically provisioned for each match.
                                    </p>
                                </div>
                                <Select
                                    value={data.serverRegion || ''}
                                    onValueChange={(v) => updateData({ serverRegion: v })}
                                >
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder={regionsLoading ? 'Loading regions...' : 'Select server region'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {regionGroups?.map((group) => (
                                            <SelectGroup key={group.continent}>
                                                <SelectLabel className="text-xs text-zinc-500 uppercase tracking-wider">
                                                    {CONTINENT_LABELS[group.continent] || group.continent}
                                                </SelectLabel>
                                                {group.regions.map((r) => (
                                                    <SelectItem key={r.id} value={r.id}>
                                                        {r.city}, {r.country}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* No game-specific settings available */}
                    {!hasAnySettings && (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                            <p className="text-sm text-gray-400">
                                No game-specific settings available for {data.game || 'this game'}.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default StepSettings;
