import { describe, expect, it } from 'vitest';
import { accessLine, ago, dateInDays, endOfDay, readLimit } from '../airFormat';

const NOW = Date.parse('2026-11-16T12:00:00Z');

describe('airFormat', () => {
  it('says where access stands', () => {
    expect(accessLine(null, null, null, NOW)).toBe('Has not opened Air');
    expect(accessLine('suspended', null, null, NOW)).toBe('Suspended');
    expect(accessLine('active', '2026-12-01T00:00:00Z', null, NOW)).toMatch(/^Active until /);
    expect(accessLine('active', '2026-11-01T00:00:00Z', null, NOW)).toMatch(/^Ended /);
    expect(accessLine('active', null, '2026-11-01T00:00:00Z', NOW)).toMatch(/^Trial ended /);
    expect(accessLine('active', null, '2026-12-01T00:00:00Z', NOW)).toBe('Active, no end');
  });

  it('reads PC limits: empty is no limit, 0 to 1000 otherwise', () => {
    expect(readLimit('')).toBeNull();
    expect(readLimit(' 2 ')).toBe(2);
    expect(readLimit('1001')).toBe('invalid');
    expect(readLimit('-1')).toBe('invalid');
    expect(readLimit('two')).toBe('invalid');
  });

  it('turns a picked day into the end of that day, and refuses junk', () => {
    expect(endOfDay('2027-02-13')).not.toBeNull();
    expect(endOfDay('13/02/2027')).toBeNull();
    expect(dateInDays(30, NOW)).toBe('2026-12-16');
  });

  it('says how long ago', () => {
    expect(ago(null, NOW)).toBe('Never');
    expect(ago('2026-11-16T11:48:00Z', NOW)).toBe('12 min ago');
    expect(ago('2026-11-16T09:00:00Z', NOW)).toBe('3 h ago');
    expect(ago('2026-11-13T12:00:00Z', NOW)).toBe('3 days ago');
  });
});
