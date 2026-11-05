import type { PopularAgent } from '@/types/competitive';

/** What a Squad Up player card shows. Live cards and the demo's sample players both map into this. */
export interface SlatePlayer {
  id: string;
  name: string;
  riotGameName?: string | null;
  riotTagLine?: string | null;
  /** Resolved avatar image, used by small surfaces (squad rail, match popup). */
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  avatarStyle?: string | null;
  profileAvatarUrl?: string | null;
  /** Riot player card id: its wide art is the card banner, as on Find Teammates. */
  playerCardId?: string | null;
  bannerUrl?: string | null;
  countryCode?: string | null;
  area?: string | null;
  mode: 'competitive' | 'unrated';
  tier?: number | null;
  tierName?: string | null;
  winRate?: number | null;
  kd?: number | null;
  hs?: number | null;
  agents: PopularAgent[];
  roles?: string[];
  mic: boolean;
  needs: number;
  likedYou?: boolean;
  synergy?: 'great_synergy' | 'role_overlap' | 'unknown';
  note?: string | null;
}
