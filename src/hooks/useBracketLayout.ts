/**
 * useBracketLayout - Extracts bracket position calculation logic
 * 
 * Computes positions for all matches in a bracket visualization.
 * Memoized for performance - only recalculates when matches or edges change.
 */

import { useMemo } from 'react';
import type { BracketMatch } from '@/types/bracketTypes';
import type { BracketEdge } from '@/types/bracket-graph';

// Layout constants
export const CARD_WIDTH = 320;
export const CARD_HEIGHT = 180;
export const ROUND_GAP = 92;
export const MATCH_GAP = 8;
export const LEFT_PADDING = 50;
export const HEADING_HEIGHT = 40;
export const HEADING_MARGIN = 32;
export const BRACKET_SPACING = 64;

export interface BracketLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  totalWidth: number;
  totalHeight: number;
  winnersBottomY: number;
}

interface UseBracketLayoutOptions {
  matches: BracketMatch[];
  edges?: BracketEdge[];
}

const getRawId = (id: string | number) => String(id).replace(/^(db-|wb-|lb-)/, '');

export function useBracketLayout({ matches, edges }: UseBracketLayoutOptions): BracketLayoutResult {
  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();

    if (matches.length === 0) return map;

    // 1. Group by Round and Bracket Side
    const rounds: Record<string, Record<number, BracketMatch[]>> = {
      winners: {},
      losers: {},
      final: {}
    };

    matches.forEach(m => {
      const side = m.bracketSide || 'winners';
      if (!rounds[side][m.round]) rounds[side][m.round] = [];
      rounds[side][m.round].push(m);
    });

    // Sort matches in each round by matchNumber
    Object.keys(rounds).forEach(side => {
      Object.keys(rounds[side]).forEach(r => {
        rounds[side][Number(r)].sort((a, b) => a.matchNumber - b.matchNumber);
      });
    });

    // 2. Calculate Positions for Winners Bracket (Slot-Based)
    const wRounds = Object.keys(rounds.winners).map(Number).sort((a, b) => a - b);

    // Track the "virtual slot" of each match to calculate parents
    const matchSlots = new Map<string, number>();

    wRounds.forEach((round, rIdx) => {
      const roundMatches = rounds.winners[round];

      roundMatches.forEach((m, idx) => {
        const id = String(m.id);
        const rawId = getRawId(id);

        let slot = 0;

        if (rIdx === 0) {
          // Round 1: Assign sequential slots
          slot = idx;
        } else {
          // Subsequent Rounds: Center between children
          const children = edges?.filter(e =>
            String(e.target_match_id) === rawId || String(e.target_match_id) === id
          ).map(e => String(e.source_match_id)) || [];

          const childSlots = children.map(cId => matchSlots.get(cId)).filter(s => s !== undefined);

          if (childSlots.length > 0) {
            const min = Math.min(...childSlots as number[]);
            const max = Math.max(...childSlots as number[]);
            slot = (min + max) / 2;
          } else {
            // Fallback
            slot = idx * Math.pow(2, rIdx);
          }
        }

        matchSlots.set(id, slot);
        matchSlots.set(rawId, slot);

        const x = LEFT_PADDING + (rIdx * (CARD_WIDTH + ROUND_GAP));
        const y = HEADING_HEIGHT + HEADING_MARGIN + (slot * (CARD_HEIGHT + MATCH_GAP));

        map.set(id, { x, y });
        map.set(rawId, { x, y });
      });
    });

    // Process Losers Bracket (Stack below)
    const maxWinnersY = Math.max(...Array.from(map.values()).map(p => p.y + CARD_HEIGHT), 0);
    const losersHeadingY = maxWinnersY + BRACKET_SPACING;
    const losersStartY = losersHeadingY + HEADING_HEIGHT + HEADING_MARGIN;

    const lRounds = Object.keys(rounds.losers).map(Number).sort((a, b) => a - b);

    lRounds.forEach((round, rIdx) => {
      rounds.losers[round].forEach((m, idx) => {
        const id = String(m.id);
        const rawId = getRawId(id);
        const x = LEFT_PADDING + (rIdx * (CARD_WIDTH + ROUND_GAP));
        const y = losersStartY + (idx * (CARD_HEIGHT + MATCH_GAP));
        map.set(id, { x, y });
        map.set(rawId, { x, y });
      });
    });

    // Finals - center vertically between all matches in last winners round
    const finalX = LEFT_PADDING + (wRounds.length * (CARD_WIDTH + ROUND_GAP));
    const lastRoundMatches = rounds.winners[wRounds[wRounds.length - 1]] || [];
    let finalY = 100;
    if (lastRoundMatches.length > 0) {
      const positions = lastRoundMatches.map(m => map.get(String(m.id))?.y ?? 0);
      const minY = Math.min(...positions);
      const maxY = Math.max(...positions);
      finalY = (minY + maxY + CARD_HEIGHT) / 2 - CARD_HEIGHT / 2;
    }

    const fRounds = Object.keys(rounds.final).map(Number).sort((a, b) => a - b);
    fRounds.forEach((r, rIdx) => {
      rounds.final[r].forEach((m, i) => {
        const id = String(m.id);
        const rawId = getRawId(id);
        const x = finalX + (rIdx * (CARD_WIDTH + ROUND_GAP)) + (i * (CARD_WIDTH + 50));
        map.set(id, { x, y: finalY });
        map.set(rawId, { x, y: finalY });
      });
    });

    return map;
  }, [matches, edges]);

  // Calculate canvas dimensions
  const { totalWidth, totalHeight, winnersBottomY } = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    let maxWinnerY = 0;

    matches.forEach(m => {
      const pos = positions.get(String(m.id));
      if (pos) {
        maxX = Math.max(maxX, pos.x + CARD_WIDTH);
        maxY = Math.max(maxY, pos.y + CARD_HEIGHT);
        if (m.bracketSide === 'winners') {
          maxWinnerY = Math.max(maxWinnerY, pos.y + CARD_HEIGHT);
        }
      }
    });

    return {
      totalWidth: Math.max(maxX + 400, 1600),
      totalHeight: Math.max(maxY + 400, 1000),
      winnersBottomY: maxWinnerY
    };
  }, [matches, positions]);

  return { positions, totalWidth, totalHeight, winnersBottomY };
}

export default useBracketLayout;
