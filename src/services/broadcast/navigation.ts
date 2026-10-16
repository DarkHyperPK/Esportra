/** Broadcast workspaces own their sidebar; public and other product pages retain site navigation. */
export function usesBroadcastWorkspaceNavigation(pathname: string, search = '') {
  if (pathname === '/broadcast' || pathname.startsWith('/broadcast/') || pathname === '/air') return true;
  return pathname.startsWith('/organizer/tournament/') && new URLSearchParams(search).get('tab') === 'broadcast';
}
