import { describe, expect, it } from 'vitest';
import { countries } from '@/utils/countries';
import { COUNTRY_AREAS, areaOf, countryName, toggleArea } from './countryAreas';

describe('countryAreas', () => {
  it('puts every known country in exactly one area', () => {
    const all: string[] = COUNTRY_AREAS.flatMap((area) => [...area.codes]);
    expect(new Set(all).size).toBe(all.length);
    const missing = countries.map((country) => country.code).filter((code) => !all.includes(code));
    expect(missing).toEqual([]);
  });

  it('finds an area case-insensitively and names countries', () => {
    expect(areaOf('pk')?.id).toBe('south-asia');
    expect(areaOf('ZZ')).toBeUndefined();
    expect(countryName('pk')).toBe('Pakistan');
    expect(countryName('zz')).toBe('ZZ');
  });

  it('selects a whole area without duplicating countries already chosen', () => {
    const next = toggleArea(['PK', 'GB'], 'south-asia');
    expect(next.filter((code) => code === 'PK')).toHaveLength(1);
    expect(next).toEqual(expect.arrayContaining(['IN', 'BD', 'GB']));
  });

  it('clears an area when all of it was selected and keeps other picks', () => {
    const southAsia = [...COUNTRY_AREAS[0].codes];
    expect(toggleArea([...southAsia, 'GB'], 'south-asia')).toEqual(['GB']);
  });
});
