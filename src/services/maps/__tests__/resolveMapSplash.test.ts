import { describe, expect, it } from 'vitest';
import { resolveMapSplash, type ValorantCatalogMap } from '../valorantMapAssets';

const catalog: ValorantCatalogMap[] = [
  { uuid: 'new-uuid', displayName: 'Plummet', mapUrl: '/Game/Maps/Plummet/Plummet', splash: 'https://media.valorant-api.com/maps/new-uuid/splash.png' },
];

describe('resolveMapSplash', () => {
  it('uses the built-in table for known maps and their code names', () => {
    expect(resolveMapSplash('Haven', '/Game/Maps/Triad/Triad')).toContain('2bee0dc9');
    expect(resolveMapSplash('Unknown', '/Game/Maps/Rook/Rook')).toContain('1c18ab1f');
  });

  it('finds a newer map in the catalog by name or by map path', () => {
    expect(resolveMapSplash('Plummet', null, catalog)).toBe('https://media.valorant-api.com/maps/new-uuid/splash.png');
    expect(resolveMapSplash('???', '/Game/Maps/Plummet/Plummet', catalog)).toContain('new-uuid');
  });

  it('returns null rather than a broken URL when nothing knows the map', () => {
    expect(resolveMapSplash('Plummet', '/Game/Maps/Plummet/Plummet')).toBeNull();
  });
});
