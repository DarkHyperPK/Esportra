import React from 'react';
import { Settings, User, Users } from 'lucide-react';
import { resolveSoloParticipantDisplayName } from '@/utils/gameFeatures';
import { EYEBROW_CLASS } from '@/components/ui/kit';

interface TeamCardProps {
    participant: any;
    onManage: (participant: any) => void;
    renderStatusBadge: (participant: any) => React.ReactNode;
}

interface MemberInfo {
    username: string;
    avatar_url?: string | null;
    riot_tag?: string | null;
    discord_handle?: string | null;
    steam_tag?: string | null;
    roster_role?: string | null;
}

const ROSTER_PREVIEW = 5;

/** Members arrive as an array, a JSON array string, or a comma list. */
function getMembers(membersInput: unknown): MemberInfo[] {
    if (!membersInput) return [];
    const toMember = (m: unknown): MemberInfo | null => {
        if (typeof m === 'string') return m ? { username: m } : null;
        if (m && typeof m === 'object') {
            const obj = m as Record<string, unknown>;
            const username = String(obj.username || obj.name || '');
            if (!username) return null;
            return {
                username,
                avatar_url: (obj.avatar_url as string) ?? null,
                riot_tag: (obj.riot_tag as string) ?? null,
                discord_handle: (obj.discord_handle as string) ?? null,
                steam_tag: (obj.steam_tag as string) ?? null,
                roster_role: (obj.roster_role as string) ?? null,
            };
        }
        return null;
    };
    if (Array.isArray(membersInput)) return membersInput.map(toMember).filter((m): m is MemberInfo => m !== null);
    if (typeof membersInput !== 'string') return [];
    const trimmed = membersInput.trim();
    if (trimmed.startsWith('[')) {
        try {
            const parsed: unknown = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return parsed.map(toMember).filter((m): m is MemberInfo => m !== null);
        } catch { /* fall through to comma split */ }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean).map((s) => ({ username: s }));
}

function PlatformIds({ discord, riot, steam }: { discord?: string | null; riot?: string | null; steam?: string | null }) {
    if (!discord && !riot && !steam) return null;
    return (
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-zinc-500">
            {discord && (
                <span className="inline-flex items-center gap-1" title="Discord">
                    <img src="/discord-icon.svg" alt="" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {discord}
                </span>
            )}
            {riot && (
                <span className="inline-flex items-center gap-1" title="Riot ID">
                    <img src="/riot-icon.svg" alt="" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {riot}
                </span>
            )}
            {steam && (
                <span className="inline-flex items-center gap-1" title="Steam">
                    <img src="/steam-icon.svg" alt="" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {steam}
                </span>
            )}
        </div>
    );
}

/**
 * One registration in the participants grid. Identity first (logo, name),
 * then status, then the roster — all visible at once, no hover-to-reveal,
 * so it reads the same on touch screens.
 */
export const OrganizerTeamCard = React.forwardRef<HTMLDivElement, TeamCardProps>(function OrganizerTeamCard(
    { participant, onManage, renderStatusBadge },
    ref
) {
    const isSolo = participant.entry_kind === 'solo_player' || participant.participant_type === 'solo';
    const tournamentGame = participant.tournament?.game || '';
    const tournamentMode = participant.tournament?.game_mode ?? participant.tournament?.gameMode;
    const displayName: string = isSolo
        ? resolveSoloParticipantDisplayName(participant, tournamentGame, tournamentMode)
        : (participant.display_name || participant.team_name || 'Unnamed team');
    const displayLogo: string | undefined = isSolo
        ? (participant.display_logo_url || participant.user?.avatar_url)
        : (participant.display_logo_url || participant.team_logo);
    const members = isSolo ? [] : getMembers(participant.team_members);
    const joined = participant.registered_at ? new Date(participant.registered_at).toLocaleDateString() : null;
    const FallbackIcon = isSolo ? User : Users;

    const soloRiot: string | null = isSolo
        ? (participant.solo_riot_tag || participant.user?.riot_tag || participant.gamer_tag || null)
        : null;
    const soloDiscord: string | null = isSolo
        ? (participant.discord_handle || participant.user?.discord_handle || null)
        : null;
    const soloSteam: string | null = isSolo
        ? (participant.solo_steam_tag || participant.user?.steam_tag || null)
        : null;

    return (
        <div
            ref={ref}
            className="group relative flex h-full flex-col bg-card shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)] transition-shadow hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
        >
            <div className="flex items-start gap-4 p-5">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-white/[0.04] ${isSolo ? 'rounded-full' : ''}`}>
                    {displayLogo ? (
                        <img src={displayLogo} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                    ) : (
                        <FallbackIcon className="h-6 w-6 text-zinc-600" aria-hidden />
                    )}
                </span>
                <div className="min-w-0 flex-1">
                    <p className={EYEBROW_CLASS}>{isSolo ? 'Solo player' : 'Team'}</p>
                    <h3 className="mt-1 truncate font-heading text-base font-bold text-white">{displayName}</h3>
                    {joined && <p className="mt-0.5 text-xs text-zinc-500">Joined {joined}</p>}
                </div>
                <button
                    type="button"
                    onClick={() => onManage(participant)}
                    aria-label={`Manage ${displayName}`}
                    className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                    <Settings className="h-4 w-4" aria-hidden />
                </button>
            </div>

            <div className="flex flex-wrap gap-1.5 px-5">{renderStatusBadge(participant)}</div>

            {isSolo && (soloDiscord || soloRiot || soloSteam) && (
                <div className="mt-3 border-t border-white/[0.06] px-5 py-3">
                    <PlatformIds discord={soloDiscord} riot={soloRiot} steam={soloSteam} />
                </div>
            )}

            {!isSolo && (
                <div className="mt-4 border-t border-white/[0.06] px-5 py-4">
                    {members.length > 0 ? (
                        <ol className="space-y-2 text-sm">
                            {members.slice(0, ROSTER_PREVIEW).map((member, idx) => (
                                <li key={`${member.username}-${idx}`} className="flex items-start gap-3">
                                    <span className="mt-0.5 w-4 text-right font-mono text-[11px] text-zinc-600">{idx + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-zinc-300">{member.username}</span>
                                            {member.roster_role && member.roster_role !== 'starter' && (
                                                <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                                                    member.roster_role === 'coach'
                                                        ? 'bg-amber-500/15 text-amber-400'
                                                        : 'bg-zinc-700 text-zinc-400'
                                                }`}>
                                                    {member.roster_role === 'substitute' ? 'Sub' : member.roster_role}
                                                </span>
                                            )}
                                        </div>
                                        <PlatformIds discord={member.discord_handle} riot={member.riot_tag} steam={member.steam_tag} />
                                    </div>
                                </li>
                            ))}
                            {members.length > ROSTER_PREVIEW && (
                                <li className="pl-7 text-xs text-zinc-500">and {members.length - ROSTER_PREVIEW} more</li>
                            )}
                        </ol>
                    ) : (
                        <p className="text-sm text-zinc-500">No roster added yet.</p>
                    )}
                </div>
            )}
        </div>
    );
});
