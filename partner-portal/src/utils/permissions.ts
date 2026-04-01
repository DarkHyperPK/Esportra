
export type Tier = 'partner' | 'ascendant' | 'radiant';

export const TIER_FEATURES = {
    partner: {
        canUploadBanner: false,
        canViewAdvancedStats: false,
        canUploadDeck: false,
        maxShowcaseImages: 0,
        maxTournamentSponsorships: 1,
        allowedZones: ['ticker'] as string[],
        label: 'Partner',
        color: 'text-blue-400'
    },
    ascendant: {
        canUploadBanner: true,
        canViewAdvancedStats: true,
        canUploadDeck: true,
        maxShowcaseImages: 5,
        maxTournamentSponsorships: 3,
        allowedZones: ['ticker', 'sidebar', 'card_badge'] as string[],
        label: 'Ascendant Partner',
        color: 'text-emerald-500'
    },
    radiant: {
        canUploadBanner: true,
        canViewAdvancedStats: true,
        canUploadDeck: true,
        maxShowcaseImages: 8,
        maxTournamentSponsorships: -1, // unlimited
        allowedZones: ['ticker', 'sidebar', 'card_badge', 'header', 'match_bar', 'stream_overlay'] as string[],
        label: 'Radiant Partner',
        color: 'text-amber-500'
    }
};

export const normalizeTier = (tier?: string | null): Tier => {
    if (!tier) return 'partner';
    const t = tier.toLowerCase();
    if (t in TIER_FEATURES) return t as Tier;
    // Map legacy tiers
    if (t === 'standard' || t === 'diamond') return 'partner';
    return 'partner';
};

export const getTierFeatures = (tier?: string | null) => {
    return TIER_FEATURES[normalizeTier(tier)];
};
