export const PLACEMENT_ZONES = [
  'homepage_ticker',
  'partner_showcase',
  'sidebar_partner',
  'wide_partner',
  'card_badge',
  'partner_logo',
] as const;

export type PlacementZone = typeof PLACEMENT_ZONES[number];

export type MediaField = 'logo' | 'banner' | 'tall_banner';

export const ZONE_META: Record<PlacementZone, {
  label: string;
  maxSlots: number;
  isGlobal: boolean;
  description: string;
  mediaFields: MediaField[];
}> = {
  homepage_ticker: { label: 'Homepage Ticker', maxSlots: 10, isGlobal: true, description: 'Logo scroll on landing page', mediaFields: ['logo'] },
  partner_showcase: { label: 'Partner Showcase', maxSlots: 6, isGlobal: true, description: 'Full sections on /partners page', mediaFields: ['banner'] },
  sidebar_partner: { label: 'Sidebar Partner', maxSlots: 2, isGlobal: false, description: 'Tall vertical ads in tournament sidebar', mediaFields: ['tall_banner'] },
  wide_partner: { label: 'Wide Partner', maxSlots: 4, isGlobal: false, description: '2×2 grid cards in tournament content', mediaFields: ['banner'] },
  card_badge: { label: 'Card Badge', maxSlots: 1, isGlobal: false, description: '"Powered by" badge on this tournament card', mediaFields: ['logo'] },
  partner_logo: { label: 'Partner Logo', maxSlots: 4, isGlobal: false, description: 'Logo row below wide partners', mediaFields: ['logo'] },
};

export const MEDIA_FIELD_LABELS: Record<MediaField, string> = {
  logo: 'Logo',
  banner: 'Banner Image',
  tall_banner: 'Tall Banner (1:2)',
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

export function displayTier(tier: string | null | undefined): string {
  const t = tier?.toLowerCase();
  if (t === 'diamond' || t === 'standard') return 'Partner';
  if (t === 'ascendant') return 'Ascendant';
  if (t === 'radiant') return 'Radiant';
  return 'Partner';
}

export function requiredAssetRole(zone: PlacementZone): 'banner' | 'logo' {
  const meta = ZONE_META[zone];
  if (meta.mediaFields.includes('logo') && !meta.mediaFields.includes('banner') && !meta.mediaFields.includes('tall_banner')) return 'logo';
  return 'banner';
}
