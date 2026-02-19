import React from 'react';
import { Swords } from 'lucide-react';

export const MAP_THEMES: Record<string, { color: string; bg: string; id: string }> = {
    'haven': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', id: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047' },
    'bind': { color: 'text-amber-400', bg: 'bg-amber-500/10', id: '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba' },
    'ascent': { color: 'text-blue-400', bg: 'bg-blue-500/10', id: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319' },
    'split': { color: 'text-indigo-400', bg: 'bg-indigo-500/10', id: 'd960549e-485c-e861-8d71-aa9d1aed12a2' },
    'icebox': { color: 'text-cyan-400', bg: 'bg-cyan-500/10', id: 'e2ad5c54-4114-a870-9641-8ea21279579a' },
    'breeze': { color: 'text-rose-400', bg: 'bg-rose-500/10', id: '2fb9a4fd-47b8-4e7d-a969-74b4046ebd53' },
    'fracture': { color: 'text-emerald-400', bg: 'bg-emerald-500/10', id: 'b529448b-4d60-346e-e89e-00a4c527a405' },
    'lotus': { color: 'text-orange-400', bg: 'bg-orange-500/10', id: '2fe4ed3a-450a-948b-6d6b-e89a78e680a9' },
    'sunset': { color: 'text-purple-400', bg: 'bg-purple-500/10', id: '92584fbe-486a-b1b2-9faa-39b0f486b498' },
    'juliett': { color: 'text-purple-400', bg: 'bg-purple-500/10', id: '92584fbe-486a-b1b2-9faa-39b0f486b498' },
    'abyss': { color: 'text-blue-400', bg: 'bg-blue-500/10', id: '224b0a95-48b9-f703-1bd8-67aca101a61f' },
    'infinity': { color: 'text-blue-400', bg: 'bg-blue-500/10', id: '224b0a95-48b9-f703-1bd8-67aca101a61f' },
    'corrode': { color: 'text-zinc-400', bg: 'bg-zinc-500/10', id: '1c18ab1f-420d-0d8b-71d0-77ad3c439115' },
    'rook': { color: 'text-zinc-400', bg: 'bg-zinc-500/10', id: '1c18ab1f-420d-0d8b-71d0-77ad3c439115' }
};

export const getAgentIcon = (characterId: string | number) => `https://media.valorant-api.com/agents/${characterId}/displayicon.png`;
export const getMapSplash = (mapId: string) => `https://media.valorant-api.com/maps/${mapId}/splash.png`;

interface FullScoreboardProps {
    players: any[];
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
    reporterSide?: 'Blue' | 'Red';
    reportedByTeamId?: string;
    team1Id?: string;
    t1Side?: 'Blue' | 'Red';
}

const PlayerRow = ({ player }: { player: any }) => (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-white/5 transition-colors rounded-lg group/row">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 bg-zinc-800">
                <img src={getAgentIcon(player.characterId)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-bold text-zinc-200 group-hover/row:text-white transition-colors">
                    {player.gameName}
                    <span className="text-zinc-500 font-medium ml-1">#{player.tagLine}</span>
                </span>
            </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
                <span className="text-emerald-400 font-bold text-xs">{player.kills}</span>
                <span className="text-zinc-700 text-[10px]">/</span>
                <span className="text-rose-500 font-bold text-xs">{player.deaths}</span>
                <span className="text-zinc-700 text-[10px]">/</span>
                <span className="text-zinc-400 font-bold text-xs">{player.assists}</span>
            </div>
            <div className="min-w-[50px] text-right">
                <span className="text-zinc-500 font-mono text-[10px] uppercase">Score</span>
                <div className="text-xs font-black text-white">{player.score.toLocaleString()}</div>
            </div>
        </div>
    </div>
);

export const FullScoreboard: React.FC<FullScoreboardProps> = ({
    players,
    team1Name,
    team2Name,
    team1Score,
    team2Score,
    reporterSide,
    reportedByTeamId,
    team1Id,
    t1Side
}) => {
    // Determine which Riot team (Blue/Red) corresponds to Tournament Team 1
    let isTeam1Blue = true;

    if (t1Side) {
        // Direct mapping from stored side
        isTeam1Blue = t1Side === 'Blue';
    } else if (reporterSide && reportedByTeamId && team1Id) {
        // Fallback: Infer from reporter
        const isReporterTeam1 = String(reportedByTeamId).toLowerCase() === String(team1Id).toLowerCase();
        isTeam1Blue = isReporterTeam1 ? (reporterSide === 'Blue') : (reporterSide === 'Red');
    }

    const team1RiotPlayers = players.filter(p => isTeam1Blue ? (p.teamId === 'Blue' || p.teamId === 1200) : (p.teamId === 'Red' || p.teamId === 1100));
    const team2RiotPlayers = players.filter(p => isTeam1Blue ? (p.teamId === 'Red' || p.teamId === 1100) : (p.teamId === 'Blue' || p.teamId === 1200));

    return (
        <div className="space-y-6 py-2">
            {/* Team 1 Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{team1Name}</span>
                    <span className="text-lg font-black text-white">{team1Score}</span>
                </div>
                <div className="bg-zinc-900/30 rounded-xl border border-white/5 overflow-hidden">
                    {team1RiotPlayers.map((p, i) => <PlayerRow key={i} player={p} />)}
                </div>
            </div>

            {/* Team 2 Section */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{team2Name}</span>
                    <span className="text-lg font-black text-white">{team2Score}</span>
                </div>
                <div className="bg-zinc-900/30 rounded-xl border border-white/5 overflow-hidden">
                    {team2RiotPlayers.map((p, i) => <PlayerRow key={i} player={p} />)}
                </div>
            </div>
        </div>
    );
};
