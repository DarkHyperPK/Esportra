import { useMemo } from 'react';
import type { PublicProfileDto, LinkedAccountsDto } from '@/types/profile';
import { countryAccentColors } from '@/data/countryAccentColors';

const PLATFORM_NEUTRAL = '#7B61FF';
const RIOT_RED = '#FF4655';
const STEAM_ACCENT = '#4A90D9';

/**
 * useAccentColor: computes accent color from profile data.
 * Priority: Riot → Steam → country flag → fallback #7B61FF.
 * Returns a stable hex string. Does not animate on change.
 */
export function useAccentColor(
  profile: PublicProfileDto,
  linkedAccounts: LinkedAccountsDto | null,
): string {
  return useMemo(() => {
    // 1. Riot linked
    if (linkedAccounts?.riot?.game_name) {
      return RIOT_RED;
    }
    // 2. Steam linked (no Riot)
    if (linkedAccounts?.steam?.steam_name) {
      return STEAM_ACCENT;
    }
    // 3. Country code lookup
    if (profile.country_code) {
      const color = countryAccentColors[profile.country_code.toUpperCase()];
      if (color) return color;
    }
    // 4. Fallback
    return PLATFORM_NEUTRAL;
  }, [linkedAccounts, profile.country_code]);
}
