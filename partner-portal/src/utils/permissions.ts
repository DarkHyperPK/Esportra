
export type Tier = 'standard' | 'diamond' | 'ascendant' | 'radiant';

export const TIER_FEATURES = {
    standard: {
        canUploadBanner: false,
        canViewAdvancedStats: false,
        maxShowcaseImages: 0,
        label: 'Official Partner',
        color: 'text-zinc-500'
    },
    diamond: {
        canUploadBanner: false,
        canViewAdvancedStats: false,
        maxShowcaseImages: 0,
        label: 'Diamond Partner',
        color: 'text-rose-500'
    },
    ascendant: {
        canUploadBanner: true,
        canViewAdvancedStats: true,
        maxShowcaseImages: 5,
        label: 'Ascendant Partner',
        color: 'text-emerald-500'
    },
    radiant: {
        canUploadBanner: true,
        canViewAdvancedStats: true,
        maxShowcaseImages: 8,
        label: 'Radiant Partner',
        color: 'text-amber-500'
    }
};

export const normalizeTier = (tier?: string | null): Tier => {
    if (!tier) return 'standard';
    // Case insensitive match
    const t = tier.toLowerCase() as Tier;
    if (t in TIER_FEATURES) return t;
    return 'standard';
};

export const getTierFeatures = (tier?: string | null) => {
    return TIER_FEATURES[normalizeTier(tier)];
};
