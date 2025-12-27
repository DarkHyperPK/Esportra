import React from 'react';
import BracketRound from './BracketRound';

// Types
export interface BracketTeam {
  id: string;
  name: string;
  logo?: string | null;
  score?: number | null;
  isWinner?: boolean;
  eliminated?: boolean;
}

export interface BracketMatch {
  id: string;
  round: number;
  match_number: number;
  status: string;
  team1: BracketTeam | null;
  team2: BracketTeam | null;
  winner_id?: string | null;
  scheduledTime?: string;
}

interface SingleEliminationBracketCustomProps {
  matches: BracketMatch[];
  userTeamId?: string;
  onMatchAction?: (matchId: string) => void;
  getMatchActionLabel?: (match: any) => string;
  renderMatchActions?: (match: any) => React.ReactNode;
}

// Helper: group matches by round
function groupMatchesByRound(matches: BracketMatch[]) {
  const rounds: BracketMatch[][] = [];
  matches.forEach((m) => {
    if (!rounds[m.round - 1]) rounds[m.round - 1] = [];
    rounds[m.round - 1].push(m);
  });
  return rounds;
}

const SingleEliminationBracketCustom: React.FC<SingleEliminationBracketCustomProps> = ({
  matches,
  userTeamId,
  onMatchAction,
  getMatchActionLabel,
  renderMatchActions
}) => {
  const rounds = groupMatchesByRound(matches);
  const totalRounds = rounds.length;

  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="flex gap-12 justify-center items-start min-w-max px-8">
        {rounds.map((roundMatches, roundIdx) => (
          <BracketRound
            key={`round-${roundIdx + 1}`}
            roundNumber={roundIdx + 1}
            totalRounds={totalRounds}
            matches={roundMatches as any}
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
    </div>
  );
};

export default SingleEliminationBracketCustom;