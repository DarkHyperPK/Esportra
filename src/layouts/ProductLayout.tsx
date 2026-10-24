import { Outlet } from 'react-router-dom';

/**
 * Passthrough layout for /competitive/* routes.
 * The app shell (AppShell.tsx) now owns the sidebar and bottom nav for all
 * authenticated routes when nav_v2 is enabled.
 */
export function ProductLayout() {
  return <Outlet />;
}
