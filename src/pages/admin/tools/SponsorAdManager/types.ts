export const PLACEMENT_ZONES = [
  'homepage_ticker',
  'partner_showcase',
  'sidebar_partner',
  'wide_partner',
  'card_badge',
  'partner_logo',
] as const;

export type PlacementZone = typeof PLACEMENT_ZONES[number];

export const ZONE_META: Record<PlacementZone, { label: string; maxSlots: number; isGlobal: boolean; description: string }> = {
  homepage_ticker: { label: 'Homepage Ticker', maxSlots: 10, isGlobal: true, description: 'Logo scroll on landing page' },
  partner_showcase: { label: 'Partner Showcase', maxSlots: 6, isGlobal: true, description: 'Full sections on /partners page' },
  sidebar_partner: { label: 'Sidebar Partner', maxSlots: 2, isGlobal: false, description: 'Tall vertical ads in tournament sidebar' },
  wide_partner: { label: 'Wide Partner', maxSlots: 4, isGlobal: false, description: '2×2 grid cards in tournament content' },
  card_badge: { label: 'Card Badge', maxSlots: 1, isGlobal: true, description: '"Powered by" badge on tournament cards' },
  partner_logo: { label: 'Partner Logo', maxSlots: 4, isGlobal: false, description: 'Logo row below wide partners' },
};

export const TIER_ZONES: Record<string, PlacementZone[]> = {
  partner: ['homepage_ticker'],
  standard: ['homepage_ticker'],
  diamond: ['homepage_ticker'],
  ascendant: ['homepage_ticker', 'sidebar_partner', 'wide_partner', 'card_badge'],
  radiant: ['homepage_ticker', 'sidebar_partner', 'wide_partner', 'card_badge', 'partner_logo', 'partner_showcase'],
};

export function zonesForTier(tier: string | null | undefined): PlacementZone[] {
  return TIER_ZONES[tier?.toLowerCase() ?? 'partner'] ?? TIER_ZONES.partner;
}
