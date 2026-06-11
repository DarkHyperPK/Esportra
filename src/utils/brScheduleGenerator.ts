import type { MatchupWave } from '@/types/battleRoyale';

const toGroupLabel = (index: number) => String.fromCharCode(65 + index);

export interface BrScheduleManifest {
  totalWaves: number;
  totalLobbies: number;
  totalMatches: number;
  estimatedDurationMinutes: number;
  waves: MatchupWave[];
}

interface GenerateScheduleParams {
  seedGroupCount: number;
  groupsPerLobby?: number;
  matchesPerWave?: number;
  averageMatchDurationMinutes?: number;
}

/**
 * Circle-method pairwise generator aligned with backend BrScheduleGenerator.
 * Supports the current pro format requirement: rotating_pairwise (groupsPerLobby=2).
 */
export function generateBrSchedule({
  seedGroupCount,
  groupsPerLobby = 2,
  matchesPerWave = 1,
  averageMatchDurationMinutes = 60,
}: GenerateScheduleParams): BrScheduleManifest {
  if (seedGroupCount < 2) {
    return {
      totalWaves: 0,
      totalLobbies: 0,
      totalMatches: 0,
      estimatedDurationMinutes: 0,
      waves: [],
    };
  }

  if (groupsPerLobby !== 2) {
    throw new Error('Only pairwise rotating schedule is supported.');
  }

  if (seedGroupCount % 2 !== 0) {
    throw new Error('Seed group count must be even for pairwise rotation.');
  }

  const labels = Array.from({ length: seedGroupCount }, (_, index) => toGroupLabel(index));
  const fixed = labels[0];
  let rotating = labels.slice(1);
  const rounds = seedGroupCount - 1;
  const waves: MatchupWave[] = [];

  for (let wave = 1; wave <= rounds; wave += 1) {
    const lobbies: string[][] = [];
    lobbies.push([fixed, rotating[0]]);

    // Match C# integer division: circle.Count / 2 + 1 (JS 5/2+1 === 3.5 would add a duplicate pair).
    const innerPairLimit = Math.floor(rotating.length / 2);
    for (let i = 1; i <= innerPairLimit; i += 1) {
      const left = rotating[i];
      const right = rotating[rotating.length - i];
      if (left !== right) {
        lobbies.push([left, right].sort());
      }
    }

    waves.push({
      wave,
      lobbies: lobbies.map((lobby) => [...lobby].sort()),
    });
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  const totalWaves = waves.length;
  const totalLobbies = waves.reduce((sum, wave) => sum + wave.lobbies.length, 0);
  const totalMatches = totalLobbies * Math.max(1, matchesPerWave);

  return {
    totalWaves,
    totalLobbies,
    totalMatches,
    estimatedDurationMinutes: totalMatches * Math.max(1, averageMatchDurationMinutes),
    waves,
  };
}
