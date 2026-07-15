import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CatalogGameApi } from '@/types/gameCatalog';
import { clearGameCatalogCache, setGameCatalogFromApi } from '@/utils/gameCatalogCache';
import {
  countRosterPlayers,
  rosterMatchesTournament,
  usesTournamentLineupSelection,
  validateTournamentLineupSelection,
} from '@/utils/rosterEligibility';

const valorantCatalogGame: CatalogGameApi = {
  slug: 'valorant',
  name: 'Valorant',
  category: 'FPS',
  gameType: 'bracket',
  defaultModeKey: '5v5',
  features: { mapVeto: true, mapPool: true, mapPoolSize: 7 },
  brConfig: null,
  modes: [
    {
      modeKey: '5v5',
      name: '5v5',
      teamSize: 5,
      participantMode: 'team',
      allowsSubstitutes: true,
      maxRosterSize: 7,
    },
    {
      modeKey: 'skirmish_1v1',
      name: 'Skirmish 1v1',
      teamSize: 1,
      participantMode: 'solo',
      allowsSubstitutes: false,
      maxRosterSize: 1,
      modeGroup: 'Skirmish',
      mapPoolFilter: 'skirmish',
    },
    {
      modeKey: 'skirmish_2v2',
      name: 'Skirmish 2v2',
      teamSize: 2,
      participantMode: 'team',
      allowsSubstitutes: true,
      maxRosterSize: 3,
      modeGroup: 'Skirmish',
      mapPoolFilter: 'skirmish',
    },
  ],
  tournamentStructures: [{
    structureKey: 'single_elimination',
    name: 'Single Elimination',
    isDefault: true,
  }],
};

function seedValorantCatalog() {
  setGameCatalogFromApi({
    catalogVersion: 'test',
    schemaVersion: 1,
    contentHash: 'a'.repeat(64),
    games: [valorantCatalogGame],
  });
}

afterEach(() => {
  clearGameCatalogCache();
});

describe('rosterEligibility', () => {
  beforeEach(() => {
    seedValorantCatalog();
  });

  it('usesTournamentLineupSelection is true for skirmish_2v2 and false for 5v5 / skirmish_1v1', () => {
    expect(usesTournamentLineupSelection('Valorant', 'skirmish_2v2')).toBe(true);
    expect(usesTournamentLineupSelection('Valorant', '5v5')).toBe(false);
    expect(usesTournamentLineupSelection('Valorant', 'skirmish_1v1')).toBe(false);
  });

  it('usesTournamentLineupSelection falls back to mode key when catalog is empty', () => {
    clearGameCatalogCache();
    expect(usesTournamentLineupSelection('Valorant', 'skirmish_2v2')).toBe(true);
    expect(usesTournamentLineupSelection('Valorant', 'skirmish_1v1')).toBe(false);
  });

  it('rosterMatchesTournament accepts 5v5 Valorant roster for skirmish_2v2 tournament', () => {
    expect(rosterMatchesTournament(
      { game: 'Valorant', format: '5v5', team_size: 7 },
      'Valorant',
      'skirmish_2v2',
    )).toBe(true);
  });

  it('rosterMatchesTournament rejects mismatched game', () => {
    expect(rosterMatchesTournament(
      { game: 'CS2', format: '5v5', team_size: 5 },
      'Valorant',
      'skirmish_2v2',
    )).toBe(false);
  });

  it('countRosterPlayers excludes coaches', () => {
    expect(countRosterPlayers([
      { roster_role: 'starter' },
      { roster_role: 'substitute' },
      { roster_role: 'coach' },
    ])).toBe(2);
  });

  it('validateTournamentLineupSelection enforces 2 starters and 1 sub for skirmish_2v2', () => {
    const valid = validateTournamentLineupSelection({
      a: 'starter',
      b: 'starter',
      c: 'substitute',
    }, 'Valorant', 'skirmish_2v2');
    expect(valid.valid).toBe(true);

    const invalid = validateTournamentLineupSelection({
      a: 'starter',
      b: 'substitute',
    }, 'Valorant', 'skirmish_2v2');
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain('2 starter');
  });
});
