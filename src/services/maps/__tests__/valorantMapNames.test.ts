import { describe, expect, it } from 'vitest';
import { displayMapName, mapNameFromRiotId, registerMapCatalog, UNKNOWN_MAP } from '../valorantMapNames';

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

  it('learns maps Riot added from the published list, without overriding the built-in names', () => {
    registerMapCatalog([{ mapUrl: '/Game/Maps/TestSummitCode/TestSummitCode', displayName: 'Test Summit' }, { mapUrl: '/Game/Maps/Triad/Triad', displayName: 'Renamed' }, { displayName: 'No path' }]);
    expect(mapNameFromRiotId('/Game/Maps/TestSummitCode/TestSummitCode')).toBe('Test Summit');
    expect(displayMapName('/Game/Maps/TestSummitCode/TestSummitCode')).toBe('Test Summit');
    expect(mapNameFromRiotId('/Game/Maps/Triad/Triad')).toBe('Haven');
    expect(displayMapName('/Game/Maps/Other/Other')).toBe(UNKNOWN_MAP);
    registerMapCatalog([]);
    expect(mapNameFromRiotId('TestSummitCode')).toBe('Test Summit');
  });
});
