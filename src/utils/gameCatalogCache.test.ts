import { describe, expect, it } from 'vitest';
import { catalogGameToEsportsGame } from '@/utils/gameCatalogCache';
import type { CatalogGameApi } from '@/types/gameCatalog';

describe('catalogGameToEsportsGame', () => {
  it('maps backend logo and aliases onto EsportsGame', () => {
    const apiGame: CatalogGameApi = {
      slug: 'valorant',
      name: 'Valorant',
      category: 'FPS',
      gameType: 'bracket',
      defaultModeKey: '5v5',
      features: { mapVeto: true },
      brConfig: null,
      logo: 'https://cdn.example.com/valorant.png',
      aliases: ['valorant', 'Valorant', 'vct'],
      modes: [{
        modeKey: '5v5',
        name: '5v5',
        teamSize: 5,
        participantMode: 'team',
        allowsSubstitutes: true,
      }],
      tournamentStructures: [{
        structureKey: 'double_elimination',
        name: 'Double Elimination',
        isDefault: true,
      }],
    };

    const mapped = catalogGameToEsportsGame(apiGame);
    expect(mapped.logo).toBe('https://cdn.example.com/valorant.png');
    expect(mapped.aliases).toEqual(['valorant', 'Valorant', 'vct']);
    expect(mapped.slug).toBe('valorant');
  });
});

describe('readStoredCatalogSnapshot validation', () => {
  it('rejects malformed localStorage snapshots', async () => {
    const { readStoredCatalogSnapshot } = await import('@/utils/gameCatalogCache');
    window.localStorage.setItem('esportra.game-catalog.snapshot', JSON.stringify({ bad: true }));
    expect(readStoredCatalogSnapshot()).toBeNull();
    window.localStorage.removeItem('esportra.game-catalog.snapshot');
  });
});
