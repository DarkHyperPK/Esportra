/**
 * VirtualizedMatchesList - Simple Match List Component
 * 
 * Renders all matches for the selected round. Since we now auto-select a specific
 * round in matches view (instead of "All"), we only render ~16-64 matches at a time,
 * making infinite scroll unnecessary.
 */

import React from 'react';
import type { BracketMatch } from '@/types/bracketTypes';

interface VirtualizedMatchesListProps {
  matchGroups: [string, BracketMatch[]][];
  renderMatchCard: (match: BracketMatch, x?: number, y?: number, label?: string) => React.ReactNode;
  getMatchLabel: (match: BracketMatch) => string;
}

export const VirtualizedMatchesList: React.FC<VirtualizedMatchesListProps> = React.memo(({
  matchGroups,
  renderMatchCard,
  getMatchLabel,
}) => {
  if (matchGroups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-sm text-zinc-500">
          No matches match this filter.
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto overscroll-contain p-4" data-lenis-prevent
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="space-y-3">
        {matchGroups.map(([group, groupMatches]) => (
          <section 
            key={group} 
            className="rounded-xl border border-white/10 bg-zinc-900/40 p-3"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{group}</h3>
              <span className="text-xs text-zinc-500">{groupMatches.length} match{groupMatches.length === 1 ? '' : 'es'}</span>
            </div>
            <div
              className="grid justify-start gap-2.5"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 320px))' }}
            >
              {groupMatches.map((match) => (
                <div key={match.id} className="min-w-0">
                  {renderMatchCard(match, undefined, undefined, getMatchLabel(match))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
});

VirtualizedMatchesList.displayName = 'VirtualizedMatchesList';
