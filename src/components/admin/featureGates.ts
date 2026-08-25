import type { FeatureKey } from '@/hooks/usePlatformFeatures';

/**
 * Which curated platform feature (if any) gates an admin nav entry.
 * Entries without a feature are always visible.
 */
export const NAV_FEATURES: Record<string, FeatureKey> = {
  // href suffix -> feature
  '/admin/operations/broadcasts': 'broadcasts',
  '/admin/security/ghost': 'ghost-mode',
};

/**
 * Curated catalog metadata mirrored client-side for instant rendering.
 * Source of truth: backend FeatureCatalog + /api/admin/features/catalog.
 */
export interface CatalogFeature {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  flagId: string | null;
  seeded: boolean;
}
