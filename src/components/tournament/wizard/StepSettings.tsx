import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTROL_CLASS, Field, FormSection, InlineNotice, ToggleRow } from '@/components/ui/kit';
import { WizardStepProps } from '@/types/tournamentWizard';
import { getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { useServerRegions, CONTINENT_LABELS } from '@/hooks/useServerRegions';
import { WizardStepFrame } from './WizardStepFrame';

function LinkCountSelect({ id, value, teamSize, onChange }: { id: string; value: number; teamSize: number; onChange: (n: number) => void }) {
    return (
        <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger id={id} className={`${CONTROL_CLASS} w-56`}><SelectValue /></SelectTrigger>
            <SelectContent>
                {Array.from({ length: teamSize }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>{n === 1 ? 'Captain only' : `${n} players per team`}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

const StepSettings: React.FC<WizardStepProps> = ({ data, updateData }) => {
    const features = getEffectiveGameFeatures(data.game || '', data.gameMode);
    const isCS2 = ['counter-strike 2', 'cs2'].includes(data.game?.toLowerCase() ?? '');
    const { data: regionGroups, isLoading: regionsLoading } = useServerRegions(isCS2);
    const teamSize = data.teamSize ?? 5;

    return (
        <WizardStepFrame
            title="Match settings"
            description="How matches are played and reported, and which accounts players need before they can register."
        >
            {(features.mapVeto || features.assistedReporting || isCS2) && (
                <FormSection title="Matches">
                    {features.mapVeto && (
                        <ToggleRow
                            id="map-veto"
                            title="Map veto before each match"
                            description="Captains take turns banning and picking maps. Results can't be reported until it's done."
                            checked={data.mapVetoEnabled}
                            onCheckedChange={(checked) => updateData({ mapVetoEnabled: checked })}
                        />
                    )}
                    {features.assistedReporting && (
                        <ToggleRow
                            id="assisted-reporting"
                            title="Pull results from Riot"
                            description="Captains pick the finished match from their history instead of typing scores. Fewer typos, fewer disputes."
                            checked={data.assistedMatchReporting}
                            onCheckedChange={(checked) => updateData({ assistedMatchReporting: checked, requiredAccountLinks: checked ? (data.requiredAccountLinks || 1) : 1 })}
                        >
                            <Field label="Riot accounts required" htmlFor="riot-links" hint="Players who haven't linked Riot can't register until this many on the team have.">
                                <LinkCountSelect id="riot-links" value={data.requiredAccountLinks ?? 1} teamSize={teamSize} onChange={(n) => updateData({ requiredAccountLinks: n })} />
                            </Field>
                        </ToggleRow>
                    )}
                    {isCS2 && (
                        <Field label="Server location" htmlFor="server-region" hint="Pick the city closest to most players. A dedicated server starts for each match.">
                            <Select value={data.serverRegion || ''} onValueChange={(v) => updateData({ serverRegion: v })}>
                                <SelectTrigger id="server-region" className={`${CONTROL_CLASS} w-72`}>
                                    <SelectValue placeholder={regionsLoading ? 'Loading locations…' : 'Choose a location'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {regionGroups?.map((group) => (
                                        <SelectGroup key={group.continent}>
                                            <SelectLabel className="text-xs text-zinc-500">{CONTINENT_LABELS[group.continent] || group.continent}</SelectLabel>
                                            {group.regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.city}, {r.country}</SelectItem>)}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    )}
                </FormSection>
            )}

            <FormSection title="Linked accounts">
                <ToggleRow
                    id="discord-required"
                    title="Require Discord"
                    description="Makes it easy to reach captains and run match chats. Players link Discord from their profile."
                    checked={(data.discordLinkCount ?? 0) > 0}
                    onCheckedChange={(checked) => updateData({ discordLinkCount: checked ? 1 : 0 })}
                >
                    <Field label="Discord accounts required" htmlFor="discord-links">
                        <LinkCountSelect id="discord-links" value={data.discordLinkCount ?? 1} teamSize={teamSize} onChange={(n) => updateData({ discordLinkCount: n })} />
                    </Field>
                </ToggleRow>
                {!features.mapVeto && !features.assistedReporting && !isCS2 && (
                    <InlineNotice tone="neutral">This game has no extra match settings. Everything else can be changed from the dashboard later.</InlineNotice>
                )}
            </FormSection>
        </WizardStepFrame>
    );
};

export default StepSettings;
