/** What a player card shows. Live cards and the demo's sample players both map into this. */
export interface SlatePlayer {
  id: string;
  name: string;
  riotId?: string | null;
  avatarUrl?: string | null;
  countryCode?: string | null;
  mode: 'competitive' | 'unrated';
  tier?: number | null;
  tierName?: string | null;
  winRate?: number | null;
  kd?: number | null;
  hs?: number | null;
  agents: { id: string; name: string; iconUrl?: string | null }[];
  roles?: string[];
  mic: boolean;
  needs: number;
  likedYou?: boolean;
  synergy?: 'great_synergy' | 'role_overlap' | 'unknown';
  note?: string | null;
}
