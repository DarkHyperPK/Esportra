import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePlatformFeatures, type FeatureKey } from '@/hooks/usePlatformFeatures';

interface FeatureFlagGuardProps {
  flagKey: FeatureKey;
  /** Where to redirect when the flag is disabled. Defaults to '/competitive'. */
  fallbackPath?: string;
  children: ReactNode;
}

/**
 * Renders children only when the named feature flag is enabled.
 * Redirects to `fallbackPath` otherwise. Loading state passes through
 * to avoid a flash of the fallback while the flags query resolves.
 */
export function FeatureFlagGuard({
  flagKey,
  fallbackPath = '/competitive',
  children,
}: FeatureFlagGuardProps) {
  const { isEnabled, isLoading } = usePlatformFeatures();

  // While the flags are still loading, render nothing so we don't redirect
  // on a flag that is about to come back as enabled.
  if (isLoading) return null;

  if (!isEnabled(flagKey)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
