import { AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGhostMode } from '@/hooks/useGhostMode';

export function GhostModeBanner() {
  const { session, isActive, exit } = useGhostMode();
  if (!isActive || !session) return null;

  const expiresAt = new Date(session.expiresAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-x-0 top-0 z-[1200] border-b border-red-500/40 bg-red-950/95 text-white shadow-2xl shadow-red-950/40">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-300 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-400" />
          </span>
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-200" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-wide">
              Ghost Mode Active: {session.targetLabel}
            </p>
            <p className="truncate text-[11px] text-red-100/80">
              Admin {session.adminId} is impersonating target {session.targetUserId}. Expires at {expiresAt}.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={exit}
          className="shrink-0 bg-white text-red-700 hover:bg-red-100"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Exit Impersonation
        </Button>
      </div>
    </div>
  );
}
