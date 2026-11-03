import { describe, expect, it } from 'vitest';
import { scrimGamesOf } from '../scrimGames';

describe('scrimGamesOf', () => {
  it('keeps only the games scrims run in, whatever the case of the slug', () => {
    expect(scrimGamesOf([{ slug: 'valorant' }, { slug: 'cs2' }, { slug: 'VALORANT' }, { slug: 'r6s' }]).map((g) => g.slug)).toEqual(['valorant', 'VALORANT']);
  });
});
