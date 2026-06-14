import { describe, expect, it } from 'vitest';
import {
  isSelfPlaySchedulingEnabled,
  readCheckinWindowMinutes,
} from '@/utils/selfPlayScheduling';

describe('selfPlayScheduling', () => {
  it('uses stage config while room-state is loading', () => {
    expect(isSelfPlaySchedulingEnabled({ self_play_enabled: true }, null)).toBe(true);
    expect(isSelfPlaySchedulingEnabled({ self_play_enabled: false }, null)).toBe(false);
  });

  it('prefers room-state once available', () => {
    expect(
      isSelfPlaySchedulingEnabled(
        { self_play_enabled: true },
        { selfPlayEnabled: false },
      ),
    ).toBe(false);
  });

  it('reads check-in window minutes from room-state or config', () => {
    expect(readCheckinWindowMinutes({ checkin_window_minutes: 20 }, null)).toBe(20);
    expect(readCheckinWindowMinutes(null, { checkinWindowMinutes: 10 })).toBe(10);
    expect(readCheckinWindowMinutes(null, null)).toBe(15);
  });
});
