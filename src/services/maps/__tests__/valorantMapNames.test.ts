import { describe, expect, it } from 'vitest';
import { displayMapName, mapNameFromRiotId, UNKNOWN_MAP } from '../valorantMapNames';

describe('valorantMapNames', () => {
  it.each([
    ['/Game/Maps/Triad/Triad', 'Haven'],
    ['Duality', 'Bind'],
    ['/Game/Maps/Rook/Rook', 'Corrode'],
    ['/Game/Maps/HURM/HURM_Alley/HURM_Alley', 'District'],
    ['infinity', 'Abyss'],
  ])('turns %s into %s', (id, name) => {
    expect(mapNameFromRiotId(id)).toBe(name);
    expect(displayMapName(id)).toBe(name);
  });

  it('never shows an unrecognised Riot path as its code', () => {
    expect(mapNameFromRiotId('/Game/Maps/Mystery/Mystery')).toBeNull();
    expect(displayMapName('/Game/Maps/Mystery/Mystery')).toBe(UNKNOWN_MAP);
  });

  it('keeps typed names and treats empty as nothing', () => {
    expect(displayMapName('Lotus')).toBe('Lotus');
    expect(displayMapName('  ')).toBeNull();
    expect(displayMapName(undefined)).toBeNull();
  });
});
