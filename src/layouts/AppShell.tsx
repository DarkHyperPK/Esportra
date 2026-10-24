import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ProductSidebar } from '@/components/navigation/ProductSidebar';
import { AppBottomNav } from '@/components/navigation/AppBottomNav';
import { usePlatformFeatures, FEATURES } from '@/hooks/usePlatformFeatures';
import { useAuth } from '@/hooks/useAuth';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.15, ease: [0, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] as const },
  },
} as const;

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
  const location = useLocation();
  const { pathname } = location;
  const prefersReducedMotion = useReducedMotion();

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
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={prefersReducedMotion ? undefined : pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <AppBottomNav />
    </>
  );
}
