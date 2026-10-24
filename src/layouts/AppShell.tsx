import { Outlet, useLocation } from 'react-router-dom';
import { ProductSidebar } from '@/components/navigation/ProductSidebar';
import { AppBottomNav } from '@/components/navigation/AppBottomNav';
import { usePlatformFeatures, FEATURES } from '@/hooks/usePlatformFeatures';
import { useAuth } from '@/hooks/useAuth';

function isChromelessPath(pathname: string): boolean {
  return (
    pathname.endsWith('/brackets/fullscreen') ||
    pathname.startsWith('/tools/brackets/embed/') ||
    pathname.startsWith('/tools/map-veto/overlay/') ||
    pathname.startsWith('/debug/riot/overlay')
  );
}

/**
 * App-wide shell for nav_v2. Renders when nav_v2 is enabled and user is
 * authenticated on a non-admin, non-chromeless route.
 *
 * Desktop: sidebar (left) + content (right).
 * Mobile: content + AppBottomNav bottom rail.
 * Otherwise: transparent Outlet passthrough.
 *
 * No max-w-* or mx-auto on any shell container (layout-viewport rule).
 */
export function AppShell() {
  const { isEnabled } = usePlatformFeatures();
  const { user } = useAuth();
  const { pathname } = useLocation();

  const navV2 = isEnabled(FEATURES.navV2);
  const isAdmin = pathname.startsWith('/admin');
  const isChromeless = isChromelessPath(pathname);

  if (!navV2 || !user || isAdmin || isChromeless) {
    return <Outlet />;
  }

  return (
    <>
      <div className="flex">
        <ProductSidebar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
      <AppBottomNav />
    </>
  );
}
