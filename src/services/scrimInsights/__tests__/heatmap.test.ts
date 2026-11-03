import { describe, expect, it } from 'vitest';
import { heatSummary, projectPoint } from '../heatmap';

// Riot's published Ascent transform.
const ascent = { xMultiplier: 7e-5, yMultiplier: -7e-5, xScalarToAdd: 0.813895, yScalarToAdd: 0.573242 };

describe('heatmap projection', () => {
  it('uses Riot’s conversion: across from y, down from x', () => {
    const p = projectPoint({ x: 1000, y: 2000 }, ascent)!;
    expect(p.across).toBeCloseTo(2000 * 7e-5 + 0.813895, 6);
    expect(p.down).toBeCloseTo(1000 * -7e-5 + 0.573242, 6);
  });

  it('draws nothing when the map has no conversion or the point falls far off the picture', () => {
    expect(projectPoint({ x: 1, y: 1 }, undefined)).toBeNull();
    expect(projectPoint({ x: 1, y: 1 }, { xMultiplier: 1 })).toBeNull();
    expect(projectPoint({ x: 99999, y: 99999 }, ascent)).toBeNull();
  });
});

describe('heat summary', () => {
  it('says what the picture shows and what it rests on', () => {
    expect(heatSummary('kills', 214, 6, 'Lotus', 'attack')).toBe('214 kills over 6 maps on Lotus, attacking.');
    expect(heatSummary('plants', 1, 1, null, null)).toBe('1 plants over 1 map.');
    expect(heatSummary('opening_deaths', 0, 0, 'Bind', 'defense')).toBe('No opening deaths recorded on Bind while defending yet.');
  });
});
