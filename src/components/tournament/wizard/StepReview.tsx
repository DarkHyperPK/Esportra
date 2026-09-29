import React from 'react';
import { Pencil } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { EYEBROW_CLASS, InlineNotice, PANEL_CLASS } from '@/components/ui/kit';
import { TournamentWizardData } from '@/types/tournamentWizard';
import { BRACKET_TYPE_LABELS } from '@/schemas/tournamentSchema';
import { LAUNCH_STATE_LABELS } from '@/utils/tournamentVisibilityUtils';
import { getBRConfig, getEffectiveGameFeatures, getParticipantMode, isBattleRoyale } from '@/utils/gameFeatures';
import { cn } from '@/lib/utils';
import { WizardStepFrame } from './WizardStepFrame';

interface StepReviewProps {
    data: TournamentWizardData;
    onEdit: (step: number) => void;
    errors: Record<string, string>;
}

type Row = { label: string; value: string; muted?: boolean };

const when = (date: string, time?: string) => {
    if (!date) return 'Not set';
    const value = time ? new Date(`${date}T${time}`) : new Date(date);
    return value.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', ...(time ? { hour: 'numeric', minute: '2-digit' } : {}) });
};
const plainText = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const isFree = (fee: string) => !fee || fee.toLowerCase() === 'free' || fee === '0';

function ReviewSection({ title, step, rows, onEdit }: { title: string; step: number; rows: Row[]; onEdit: (step: number) => void }) {
    return (
        <section className="border-t border-white/[0.07] py-5 first:border-t-0 first:pt-0">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-white">{title}</h3>
                <button type="button" onClick={() => onEdit(step)} className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white">
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                </button>
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {rows.map((row) => (
                    <div key={row.label} className="min-w-0">
                        <dt className="text-xs text-zinc-500">{row.label}</dt>
                        <dd className={cn('mt-0.5 truncate text-sm', row.muted ? 'text-zinc-500' : 'text-zinc-100')} title={row.value}>{row.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

const StepReview: React.FC<StepReviewProps> = ({ data, onEdit, errors }) => {
    const errorList = Object.values(errors).filter(Boolean);
    const features = getEffectiveGameFeatures(data.game || '', data.gameMode);
    const solo = getParticipantMode(data.game || '', data.gameMode) === 'solo';
    const isBR = isBattleRoyale(data.game || '');
    const brConfig = getBRConfig(data.game || '');
    const unit = solo ? 'players' : data.teamSize === 2 ? 'duos' : data.teamSize === 3 ? 'trios' : isBR ? 'squads' : 'teams';
    const description = plainText(data.description || '');
    const prizePool = parseFloat(data.prizePool) || 0;

    const sections: { title: string; step: number; rows: Row[] }[] = [
        {
            title: 'Basics', step: 1, rows: [
                { label: 'Game', value: data.game || 'Not chosen', muted: !data.game },
                { label: 'Where', value: data.isOnline ? 'Online' : data.venue || 'LAN, venue not set' },
                { label: 'Starts', value: when(data.startDate, data.startTime) },
                { label: 'Ends', value: data.endDate ? when(data.endDate, data.endTime) : 'Not set', muted: !data.endDate },
                { label: 'Visibility', value: LAUNCH_STATE_LABELS[data.launchState] ?? data.launchState },
            ],
        },
        {
            title: isBR ? 'Format and scoring' : 'Format', step: 2, rows: isBR ? [
                { label: 'Team size', value: solo ? 'Solo' : `${data.teamSize} players` },
                { label: 'Scoring', value: data.brScoringPreset === 'custom' ? 'Custom' : brConfig?.scoringPresets?.[data.brScoringPreset]?.name || 'Not chosen' },
                { label: 'Kill cap', value: data.brKillCap ? `${data.brKillCap} per game` : 'No cap' },
                { label: 'Tiebreaker', value: data.brTiebreaker === 'most_wins' ? 'Most first places' : data.brTiebreaker === 'most_kills' ? 'Most kills' : 'Best average placement' },
                { label: 'Capacity', value: data.maxTeams ? `${data.maxTeams} ${unit}` : 'No limit' },
            ] : [
                { label: 'Stages', value: data.stages.length ? data.stages.map((s) => `${s.name} (${BRACKET_TYPE_LABELS[s.format]})`).join(' → ') : 'One default bracket' },
                { label: 'Capacity', value: data.maxTeams ? `${data.maxTeams} ${unit}` : 'No limit' },
                { label: 'Team size', value: solo ? 'Solo' : `${data.teamSize} players` },
                ...(features.mapPool ? [{ label: 'Map pool', value: `${data.mapPoolIds?.length ?? 0} maps` }] : []),
            ],
        },
        {
            title: 'Branding', step: 3, rows: [
                { label: 'Banner', value: data.bannerUrl ? 'Added' : 'None yet', muted: !data.bannerUrl },
                { label: 'Stream', value: data.streamUrl || 'None', muted: !data.streamUrl },
                { label: 'Description', value: description ? `${description.slice(0, 90)}${description.length > 90 ? '…' : ''}` : 'Not written yet', muted: !description },
            ],
        },
        {
            title: 'Prizes', step: 4, rows: [
                { label: 'Prize pool', value: prizePool > 0 ? formatCurrency(prizePool, data.currency) : 'No cash prize', muted: prizePool <= 0 },
                { label: 'Entry fee', value: isFree(data.entryFee) ? 'Free' : formatCurrency(parseFloat(data.entryFee), data.currency) },
                { label: 'Split', value: data.prizeDistribution?.placements?.length ? data.prizeDistribution.placements.map((p) => `${p.percentage}%`).join(' / ') : 'Not set', muted: !data.prizeDistribution?.placements?.length },
            ],
        },
        {
            title: 'Registration', step: 5, rows: [
                { label: 'Closes', value: data.registrationCloses ? when(...(data.registrationCloses.split('T') as [string, string])) : 'Not set', muted: !data.registrationCloses },
                { label: 'Check-in', value: data.checkInRequired ? `Opens ${data.checkInWindowMinutes} min before start` : 'Not required' },
                ...(data.checkInRequired ? [{ label: 'No-shows', value: data.autoRemoveUnchecked ? 'Removed automatically' : 'Kept until you remove them' }] : []),
                ...(data.invitedTeamsEnabled ? [{ label: 'Held for invites', value: `${data.reservedInviteSlots} spots, codes last ${data.inviteExpiryDays} days` }] : []),
            ],
        },
        {
            title: 'Match settings', step: 6, rows: [
                ...(features.mapVeto ? [{ label: 'Map veto', value: data.mapVetoEnabled ? 'On' : 'Off' }] : []),
                ...(features.assistedReporting ? [{ label: 'Results from Riot', value: data.assistedMatchReporting ? 'On' : 'Off' }] : []),
                { label: 'Discord required', value: (data.discordLinkCount ?? 0) > 0 ? ((data.discordLinkCount ?? 0) === 1 ? 'Captain only' : `${data.discordLinkCount} per team`) : 'No' },
            ],
        },
    ];

    return (
        <WizardStepFrame
            title="Check and create"
            description="Everything in one place. Anything that looks wrong is one click from being fixed."
            errorSummary={errorList}
        >
            <div className={cn(PANEL_CLASS, 'mb-8 overflow-hidden')}>
                <div className="relative h-36 bg-black/40">
                    {data.bannerUrl && <img src={data.bannerUrl} alt="" className="h-full w-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-x-5 bottom-4">
                        <p className={EYEBROW_CLASS}>{data.game || 'Game not chosen'}</p>
                        <p className="mt-1 truncate font-heading text-2xl font-black tracking-tight text-white">{data.name || 'Untitled tournament'}</p>
                    </div>
                </div>
            </div>

            <div>
                {sections.map((section) => <ReviewSection key={section.step} {...section} onEdit={onEdit} />)}
            </div>

            {errorList.length === 0 && (
                <InlineNotice tone="success" className="mt-6">
                    Everything required is filled in. Create it now and finish the rest from the dashboard any time.
                </InlineNotice>
            )}
        </WizardStepFrame>
    );
};

export default StepReview;
