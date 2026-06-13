import { describe, expect, it } from 'vitest';
import { generateBrSchedule } from './brScheduleGenerator';
import { formatBRStageStructureSummary, formatBRStageFormatLabel, formatBRAdvancementLabel } from './brGameContext';
import { resolveMatchupLabelFromLobby, summarizeGroupRotationSchedule } from './brWaveScheduleDisplay';
import type { BRRound } from '@/types/brLobbies';

describe('generateBrSchedule', () => {
  it('K4 produces three waves with two lobbies each', () => {
    const manifest = generateBrSchedule({ seedGroupCount: 4 });

    expect(manifest.totalWaves).toBe(3);
    manifest.waves.forEach((wave) => {
      expect(wave.lobbies).toHaveLength(2);
      const keys = wave.lobbies.map((l) => l.join('+')).sort();
      expect(new Set(keys).size).toBe(keys.length);
    });
    expect(manifest.waves[0].lobbies).toEqual([
      ['A', 'B'],
      ['C', 'D'],
    ]);
  });

  it('K6 wave 1 has three unique lobbies (no duplicate pairs)', () => {
    const manifest = generateBrSchedule({ seedGroupCount: 6 });

    expect(manifest.totalWaves).toBe(5);
    expect(manifest.waves[0].lobbies).toEqual([
      ['A', 'B'],
      ['C', 'F'],
      ['D', 'E'],
    ]);
    const joined = manifest.waves[0].lobbies.map((l) => l.join('+')).join(' · ');
    expect(joined).toBe('A+B · C+F · D+E');
    expect(manifest.waves[0].lobbies).toHaveLength(3);
  });
});

describe('summarizeGroupRotationSchedule', () => {
  it('K4 single round-robin: 3 matchdays, 2 matches each, 6 games per match', () => {
    const summary = summarizeGroupRotationSchedule(4, 6);
    expect(summary.matchdayCount).toBe(3);
    expect(summary.matchesPerMatchday).toBe(2);
    expect(summary.totalCrossGroupMatches).toBe(6);
    expect(summary.gamesPerMatch).toBe(6);
    expect(summary.title).toContain('Single round-robin');
    expect(summary.notDoubleRoundRobinNote).toContain('not double');
  });
});

describe('formatBRAdvancementLabel', () => {
  it('includes teams or players in advancement copy', () => {
    expect(formatBRAdvancementLabel({ count: 5, scope: 'overall', unitsLabel: 'teams' }))
      .toBe('Top 5 teams overall');
    expect(formatBRAdvancementLabel({ count: 3, scope: 'per_group', unitsLabel: 'players' }))
      .toBe('Top 3 players per group');
  });
});

describe('formatBRStageFormatLabel', () => {
  it('maps group_rotation to Single Round-Robin', () => {
    expect(formatBRStageFormatLabel('group_rotation')).toBe('Single Round-Robin');
  });
});

describe('formatBRStageStructureSummary', () => {
  it('finals single lobby lists all finalists, not a per-lobby cap', () => {
    const summary = formatBRStageStructureSummary({
      format: 'single_lobby',
      seedGroups: 1,
      gamesPerLobby: 6,
      fieldSize: 5,
      isFinal: true,
      unitsLabel: 'teams',
    });
    expect(summary.title).toContain('Grand finals');
    expect(summary.subtitle).toContain('all 5 teams play together');
    expect(summary.subtitle).not.toContain('up to');
  });
});

describe('resolveMatchupLabelFromLobby', () => {
  const groups = [
    { id: 'g-a', name: 'Group A' },
    { id: 'g-b', name: 'Group B' },
    { id: 'g-c', name: 'Group C' },
    { id: 'g-d', name: 'Group D' },
  ];

  it('uses linked group_ids so matchdays show distinct pairings', () => {
    const lobby0: BRRound = {
      id: 'l1',
      wave_number: 1,
      lobby_index: 0,
      group_ids: ['g-a', 'g-b'],
      lobby_code: null,
      map: null,
      status: 'pending',
      scheduled_at: null,
      started_at: null,
      completed_at: null,
      created_at: '',
      result_count: 0,
    };
    const lobby1: BRRound = {
      ...lobby0,
      id: 'l2',
      lobby_index: 1,
      group_ids: ['g-c', 'g-d'],
    };

    expect(resolveMatchupLabelFromLobby(lobby0, groups, null, 4)).toBe('Group A + Group B');
    expect(resolveMatchupLabelFromLobby(lobby1, groups, null, 4)).toBe('Group C + Group D');
  });
});
