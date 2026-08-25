import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { createContext, useContext } from 'react';

export interface FeatureStatus {
  key: string;
  enabled: boolean;
}

export const FEATURES = {
  battleRoyale: 'battle-royale',
  tournamentRegistration: 'tournament-registration',
  teamInvites: 'team-invites',
  walletPos: 'wallet-pos',
  sponsorAds: 'sponsor-ads',
  broadcasts: 'broadcasts',
  ghostMode: 'ghost-mode',
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

/**
 * Live on/off state of every curated platform feature.
 * Public endpoint — safe to call anywhere (landing page included).
 */
export function usePlatformFeatures() {
  const query = useQuery({
    queryKey: ['platform-features'],
    queryFn: () => apiClient.get<{ features: FeatureStatus[] }>('/api/features/status'),
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 1,
  });

  const enabledKeys = new Set(
    (query.data?.features ?? []).filter(f => f.enabled).map(f => f.key),
  );

  return {
    features: query.data?.features ?? [],
    isEnabled: (key: FeatureKey) => enabledKeys.has(key),
    isLoading: query.isLoading,
  };
}

/** Convenience wrapper for pages that render an entire feature surface. */
export const FeatureEnabledContext = createContext<Record<string, boolean>>({});

export function useFeatureEnabled(key: FeatureKey): boolean | null {
  const ctx = useContext(FeatureEnabledContext);
  if (key in ctx) return ctx[key];
  return null;
}
