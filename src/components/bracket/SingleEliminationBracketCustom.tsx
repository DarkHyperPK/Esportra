import React from 'react';

// Types
export interface BracketTeam {
  id: string;
  name: string;
  logo?: string | null;
}
export interface BracketMatch {
  id: string;
  round: number;
  home: BracketTeam | null;
  visitor: BracketTeam | null;
  winner?: 'home' | 'visitor' | null;
}

interface SingleEliminationBracketCustomProps {
  teams: BracketTeam[];
  matches: BracketMatch[];
}

// Helper: get rounds from matches
function groupMatchesByRound(matches: BracketMatch[]) {
  const rounds: BracketMatch[][] = [];
  matches.forEach((m) => {
    if (!rounds[m.round - 1]) rounds[m.round - 1] = [];
    rounds[m.round - 1].push(m);
  });
  return rounds;
}

const SingleEliminationBracketCustom: React.FC<SingleEliminationBracketCustomProps> = ({ teams, matches }) => {
  const rounds = groupMatchesByRound(matches);
  return (
    <div className="custom-bracket-outer">
      <div className="custom-bracket-inner">
        {rounds.map((roundMatches, roundIdx) => (
          <div className="bracket-round" key={roundIdx}>
            <div className="bracket-round-label">{`Round ${roundIdx + 1}`}</div>
            {roundMatches.map((match, matchIdx) => (
              <div className={`bracket-match${match.winner ? ' winner-' + match.winner : ''}`} key={match.id}>
                <div className="bracket-team">
                  {match.home?.logo ? (
                    <img src={match.home.logo} alt={match.home.name} className="bracket-team-logo" />
                  ) : (
                    <span className="bracket-team-logo bracket-team-logo-fallback" />
                  )}
                  <span className="bracket-team-name">{match.home?.name || 'TBD'}</span>
                </div>
                <div className="bracket-vs">vs</div>
                <div className="bracket-team">
                  {match.visitor?.logo ? (
                    <img src={match.visitor.logo} alt={match.visitor.name} className="bracket-team-logo" />
                  ) : (
                    <span className="bracket-team-logo bracket-team-logo-fallback" />
                  )}
                  <span className="bracket-team-name">{match.visitor?.name || 'TBD'}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <style>{`
        .custom-bracket-outer {
          width: 100%;
          overflow-x: auto;
          padding: 32px 0;
          background: transparent;
        }
        .custom-bracket-inner {
          display: flex;
          gap: 48px;
          justify-content: center;
          align-items: flex-start;
        }
        .bracket-round {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }
        .bracket-round-label {
          color: #a259ff;
          font-weight: bold;
          margin-bottom: 16px;
          text-shadow: 0 0 8px #a259ff88;
        }
        .bracket-match {
          background: #18181b;
          border-radius: 16px;
          box-shadow: 0 0 16px #a259ff44, 0 2px 8px #000a;
          padding: 16px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 220px;
          border: 2px solid #23232b;
          transition: box-shadow 0.2s;
          position: relative;
        }
        .bracket-match:hover {
          box-shadow: 0 0 32px #a259ffcc, 0 2px 8px #000a;
          border-color: #a259ff;
        }
        .bracket-team {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .bracket-team-logo {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #23232b;
          object-fit: cover;
        }
        .bracket-team-logo-fallback {
          background: #23232b;
          display: inline-block;
        }
        .bracket-team-name {
          color: #fff;
          font-weight: 500;
          font-size: 1rem;
          text-shadow: 0 0 4px #000a;
        }
        .bracket-vs {
          color: #a259ff;
          font-weight: bold;
          font-size: 1.1rem;
          margin: 0 8px;
        }
        @media (max-width: 900px) {
          .custom-bracket-inner { gap: 24px; }
          .bracket-match { min-width: 160px; padding: 12px 8px; }
        }
      `}</style>
    </div>
  );
};

export default SingleEliminationBracketCustom; 