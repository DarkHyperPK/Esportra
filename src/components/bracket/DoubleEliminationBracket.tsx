import React, { useState } from 'react';
import BracketRound from './BracketRound';
import { BracketMatch } from './SingleEliminationBracketCustom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DoubleEliminationBracketProps {
    matches: (BracketMatch & { bracket_side?: string })[];
    userTeamId?: string;
    onMatchAction?: (matchId: string) => void;
    getMatchActionLabel?: (match: any) => string;
    renderMatchActions?: (match: any) => React.ReactNode;
}

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({
    matches,
    userTeamId,
    onMatchAction,
    getMatchActionLabel,
    renderMatchActions
}) => {
    const [activeTab, setActiveTab] = useState('winners');

    // Group matches by side and round
    const winnersMatches = matches.filter(m => m.bracket_side === 'winners');
    const losersMatches = matches.filter(m => m.bracket_side === 'losers');
    const finalsMatches = matches.filter(m => m.bracket_side === 'final' || m.bracket_side === 'reset');

    const groupByRound = (sideMatches: any[]) => {
        const rounds: any[][] = [];
        sideMatches.forEach((m) => {
            if (!rounds[m.round - 1]) rounds[m.round - 1] = [];
            rounds[m.round - 1].push(m);
        });
        return rounds.filter(Boolean);
    };

    const winnersRounds = groupByRound(winnersMatches);
    const losersRounds = groupByRound(losersMatches);
    const finalsRounds = groupByRound(finalsMatches);

    const renderBracket = (rounds: any[][], side: string) => (
        <div className="flex gap-12 justify-center items-start min-w-max px-8 py-8">
            {rounds.map((roundMatches, roundIdx) => (
                <BracketRound
                    key={`${side}-round-${roundIdx + 1}`}
                    roundNumber={roundIdx + 1}
                    totalRounds={rounds.length}
                    matches={roundMatches}
                    isCollapsed={false}
                    onToggleCollapse={() => { }}
                    expandedMatchId={null}
                    onToggleMatch={() => { }}
                    onMatchAction={onMatchAction}
                    getMatchActionLabel={getMatchActionLabel}
                    renderMatchActions={renderMatchActions}
                    userTeamId={userTeamId}
                />
            ))}
        </div>
    );

    return (
        <div className="w-full space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center mb-6">
                    <TabsList className="bg-zinc-900 border border-zinc-800">
                        <TabsTrigger value="winners" className="data-[state=active]:bg-primary">Winners Bracket</TabsTrigger>
                        <TabsTrigger value="losers" className="data-[state=active]:bg-primary">Losers Bracket</TabsTrigger>
                        <TabsTrigger value="finals" className="data-[state=active]:bg-primary">Grand Finals</TabsTrigger>
                    </TabsList>
                </div>

                <div className="overflow-x-auto bg-zinc-950/50 rounded-xl border border-zinc-900">
                    <TabsContent value="winners" className="mt-0">
                        {renderBracket(winnersRounds, 'winners')}
                    </TabsContent>
                    <TabsContent value="losers" className="mt-0">
                        {renderBracket(losersRounds, 'losers')}
                    </TabsContent>
                    <TabsContent value="finals" className="mt-0">
                        {renderBracket(finalsRounds, 'finals')}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default DoubleEliminationBracket;
