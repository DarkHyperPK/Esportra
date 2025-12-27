import React from 'react';
import { Link2, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MatchMapVeto } from '@/hooks/useMapVetoMachine';

interface VetoShareLinksProps {
    veto: MatchMapVeto;
    effectiveIsOrganizer: boolean;
    isCaptain: boolean;
    userTeamId: string | null;
    team1Name: string;
    team2Name: string;
    getTeamLink: (token: string | null) => string | null;
    copyToClipboard: (text: string, type: 'team1' | 'team2') => void;
    copiedLink: 'team1' | 'team2' | null;
    isOrganizer: boolean;
    isTeam1Captain?: boolean;
    isTeam2Captain?: boolean;
}

export const VetoShareLinks: React.FC<VetoShareLinksProps> = ({
    veto,
    effectiveIsOrganizer,
    isCaptain,
    userTeamId,
    team1Name,
    team2Name,
    getTeamLink,
    copyToClipboard,
    copiedLink,
    isOrganizer,
    isTeam1Captain,
    isTeam2Captain,
}) => {
    if (!((veto.status === 'in_progress' || veto.status === 'pending') && (effectiveIsOrganizer || isCaptain))) {
        return null;
    }

    return (
        <div className="mb-6 p-5 bg-gray-900 rounded-xl border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Team Links</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Team 1 Link */}
                {(effectiveIsOrganizer || isTeam1Captain || (isCaptain && userTeamId === veto.team1_id)) && (
                    <>
                        {veto.team1_link_token ? (
                            <div className={cn(
                                "p-3 sm:p-4 rounded-lg border",
                                (isTeam1Captain || (isCaptain && userTeamId === veto.team1_id)) && !isOrganizer
                                    ? "bg-blue-950 border-blue-600 ring-2 ring-blue-500"
                                    : "bg-gray-800 border-gray-700"
                            )}>
                                {(isTeam1Captain || (isCaptain && userTeamId === veto.team1_id)) && !effectiveIsOrganizer && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 animate-pulse">NEW</Badge>
                                        <span className="text-[10px] sm:text-xs font-bold text-emerald-400">Your Team Link</span>
                                    </div>
                                )}
                                <div className="text-[10px] sm:text-xs font-bold text-blue-400 mb-2 uppercase">{team1Name}</div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <div className="flex-1 text-[10px] sm:text-xs font-mono text-gray-300 break-all bg-gray-950 px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-700 min-w-0">
                                        {getTeamLink(veto.team1_link_token)}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(getTeamLink(veto.team1_link_token)!, 'team1')}
                                        className={cn(
                                            "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap",
                                            copiedLink === 'team1'
                                                ? "bg-emerald-600 text-white"
                                                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                                        )}
                                    >
                                        {copiedLink === 'team1' ? (
                                            <>
                                                <Check className="h-3 w-3" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
                                <div className="text-xs font-bold text-blue-400 mb-2 uppercase">{team1Name}</div>
                                <div className="text-xs text-gray-500">Link will be generated when veto starts...</div>
                            </div>
                        )}
                    </>
                )}
                {/* Team 2 Link */}
                {(effectiveIsOrganizer || isTeam2Captain || (isCaptain && userTeamId === veto.team2_id)) && (
                    <>
                        {veto.team2_link_token ? (
                            <div className={cn(
                                "p-3 sm:p-4 rounded-lg border",
                                (isTeam2Captain || (isCaptain && userTeamId === veto.team2_id)) && !isOrganizer
                                    ? "bg-purple-950 border-purple-600 ring-2 ring-purple-500"
                                    : "bg-gray-800 border-gray-700"
                            )}>
                                {(isTeam2Captain || (isCaptain && userTeamId === veto.team2_id)) && !effectiveIsOrganizer && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 animate-pulse">NEW</Badge>
                                        <span className="text-[10px] sm:text-xs font-bold text-emerald-400">Your Team Link</span>
                                    </div>
                                )}
                                <div className="text-[10px] sm:text-xs font-bold text-purple-400 mb-2 uppercase">{team2Name}</div>
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                    <div className="flex-1 text-[10px] sm:text-xs font-mono text-gray-300 break-all bg-gray-950 px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-700 min-w-0">
                                        {getTeamLink(veto.team2_link_token)}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(getTeamLink(veto.team2_link_token)!, 'team2')}
                                        className={cn(
                                            "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap",
                                            copiedLink === 'team2'
                                                ? "bg-emerald-600 text-white"
                                                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                                        )}
                                    >
                                        {copiedLink === 'team2' ? (
                                            <>
                                                <Check className="h-3 w-3" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3 w-3" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
                                <div className="text-xs font-bold text-purple-400 mb-2 uppercase">{team2Name}</div>
                                <div className="text-xs text-gray-500">Link will be generated when veto starts...</div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
