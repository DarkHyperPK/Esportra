import React from 'react';
import { motion } from 'framer-motion';
import {
    Check,
    Edit2,
    Calendar,
    Users,
    Trophy,
    UserCheck,
    Gamepad2,
    Globe,
    MapPin,
    Eye,
    EyeOff,
    Lock,
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TournamentWizardData, WIZARD_STEPS } from '@/types/tournamentWizard';
import { BRACKET_TYPE_LABELS, SEEDING_TYPE_LABELS } from '@/schemas/tournamentSchema';
import { cn } from '@/lib/utils';
import { getGameFeatures, isBattleRoyale, getBRConfig } from '@/utils/gameFeatures';

interface StepReviewProps {
    data: TournamentWizardData;
    onEdit: (step: number) => void;
    errors: Record<string, string>;
}

const StepReview: React.FC<StepReviewProps> = ({ data, onEdit, errors }) => {
    const hasErrors = Object.keys(errors).length > 0;
    const features = getGameFeatures(data.game || '');
    const isBR = isBattleRoyale(data.game || '');
    const brConfig = getBRConfig(data.game || '');

    const formatDate = (dateStr: string, timeStr?: string) => {
        if (!dateStr) return 'Not set';
        const date = timeStr ? new Date(`${dateStr}T${timeStr}`) : new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: timeStr ? '2-digit' : undefined,
            minute: timeStr ? '2-digit' : undefined,
        });
    };

    const getVisibilityIcon = () => {
        switch (data.visibility) {
            case 'public': return <Eye className="w-4 h-4" />;
            case 'unlisted': return <EyeOff className="w-4 h-4" />;
        }
    };

    const sections = [
        {
            step: 1,
            title: 'Basic Information',
            icon: <Gamepad2 className="w-5 h-5" />,
            items: [
                { label: 'Tournament Name', value: data.name || 'Not set' },
                { label: 'Game', value: data.game || 'Not selected' },
                { label: 'Type', value: data.isOnline ? 'Online' : 'LAN', icon: data.isOnline ? <Globe className="w-4 h-4" /> : <MapPin className="w-4 h-4" /> },
                { label: 'Visibility', value: data.visibility, icon: getVisibilityIcon() },
                { label: 'Start', value: formatDate(data.startDate, data.startTime) },
                ...(data.endDate ? [{ label: 'End', value: formatDate(data.endDate, data.endTime) }] : []),
                ...(!data.isOnline && data.venue ? [{ label: 'Venue', value: data.venue }] : []),
            ]
        },
        {
            step: 2,
            title: isBR ? 'Format & Scoring' : 'Format & Stages',
            icon: <Trophy className="w-5 h-5" />,
            items: isBR ? [
                { label: 'Tournament Type', value: 'Points-Based (Battle Royale)' },
                { label: 'Structure', value: data.brMultiStage ? 'Multi-Stage (Groups → Finals)' : 'Single Stage' },
                { label: 'Group Stage Games', value: `${data.brGameCount} games` },
                { label: 'Scoring', value: data.brScoringPreset === 'custom' ? 'Custom' : (brConfig?.scoringPresets?.[data.brScoringPreset]?.name || data.brScoringPreset) },
                { label: 'Kill Cap', value: data.brKillCap ? `${data.brKillCap} per game` : 'No cap' },
                { label: 'Max Participants', value: data.maxTeams ? String(data.maxTeams) : 'Unlimited' },
                { label: 'Team Size', value: String(data.teamSize) },
                ...(data.brMultiStage ? [
                    { label: 'Lobby Size', value: `${data.brLobbySize} teams per group` },
                    { label: 'Groups', value: data.maxTeams ? `${Math.ceil(data.maxTeams / data.brLobbySize)} groups` : 'TBD' },
                    { label: 'Advancement', value: `Top ${data.brAdvancementCount} per group` },
                    { label: 'Finals Games', value: `${data.brFinalsGameCount} games` },
                ] : []),
            ] : [
                { label: 'Total Stages', value: `${data.stages.length} stage(s)` },
                ...data.stages.map((stage, i) => ({
                    label: `Stage ${i + 1}`,
                    value: `${stage.name} (${BRACKET_TYPE_LABELS[stage.format]})`
                })),
                { label: 'Max Teams', value: 'Configured in Manage Stages' },
                { label: 'Team Size', value: 'Configured in Manage Stages' },
                { label: 'Seeding', value: SEEDING_TYPE_LABELS[data.seedingType] },
                ...(data.thirdPlaceMatch ? [{ label: 'Third Place Match', value: 'Yes' }] : [])
            ]
        },
        {
            step: 3,
            title: 'Branding & Details',
            icon: <Gamepad2 className="w-5 h-5" />,
            items: [
                { label: 'Prize Pool', value: data.prizePool ? `${data.currency || 'USD'} ${data.prizePool}` : 'Not set' },
                { label: 'Entry Fee', value: data.entryFee || 'Free' },
                { label: 'Banner', value: data.bannerUrl ? '✓ Uploaded' : '✗ Not uploaded' },
                { label: 'Description', value: data.description ? `${data.description.substring(0, 50)}...` : 'Not set' },
            ]
        },
        {
            step: 4,
            title: 'Registration',
            icon: <UserCheck className="w-5 h-5" />,
            items: [
                { label: 'Registration Closes', value: data.registrationCloses ? new Date(data.registrationCloses).toLocaleString() : 'Not set' },
                { label: 'Check-in', value: `${data.checkInWindowMinutes} min before start` },
                { label: 'Auto-remove no-shows', value: 'Enabled' },
                { label: 'Waitlist', value: data.waitlistEnabled ? `Yes (max ${data.waitlistMax})` : 'Disabled' },
            ]
        },
        {
            step: 5,
            title: 'Settings',
            icon: <Settings className="w-5 h-5" />,
            items: [
                ...(features.mapVeto
                    ? [{ label: 'Map Veto', value: data.mapVetoEnabled ? 'Enabled' : 'Disabled' }]
                    : []),
                ...(features.assistedReporting
                    ? [{ label: 'Assisted Match Reporting', value: data.assistedMatchReporting ? 'Enabled' : 'Disabled' }]
                    : []),
                ...(isBR
                    ? [
                        { label: 'Kill Cap', value: data.brKillCap ? `${data.brKillCap} per game` : 'No cap' },
                        { label: 'Tiebreaker', value: data.brTiebreaker === 'most_wins' ? 'Most Wins' : data.brTiebreaker === 'most_kills' ? 'Most Kills' : 'Best Placement' },
                    ]
                    : []),
                ...(!features.mapVeto && !features.assistedReporting && !isBR
                    ? [{ label: 'Game Settings', value: 'No game-specific settings' }]
                    : []),
            ]
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Review & Create</h2>
                <p className="text-gray-400">Review your tournament settings before creating</p>
            </div>

            {hasErrors && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 font-medium">Please fix the following errors:</p>
                    <ul className="mt-2 space-y-1">
                        {Object.entries(errors).map(([key, value]) => (
                            <li key={key} className="text-sm text-red-300">• {value}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Tournament Preview Card */}
            {data.bannerUrl && (
                <div className="relative rounded-lg overflow-hidden">
                    <img
                        src={data.bannerUrl}
                        alt="Tournament banner"
                        className="w-full h-40 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute bottom-4 left-4">
                        <div>
                            <h3 className="text-xl font-bold text-white">{data.name || 'Tournament Name'}</h3>
                            <p className="text-sm text-gray-300">{data.game}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Sections */}
            <div className="space-y-4">
                {sections.map((section) => (
                    <div
                        key={section.step}
                        className="p-4 bg-white/[0.02] rounded-lg border border-white/10"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="text-emerald-400">{section.icon}</div>
                                <h3 className="font-semibold text-white">{section.title}</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(section.step)}
                                className="text-gray-400 hover:text-white"
                            >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {section.items.map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">{item.label}</div>
                                    <div className="text-sm text-white flex items-center gap-1">
                                        {(item as any).icon}
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Ready indicator */}
            {!hasErrors && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                        <p className="font-medium text-green-400">Ready to create!</p>
                        <p className="text-sm text-green-300/70">All required fields are filled. Click "Create Tournament" below.</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default StepReview;
