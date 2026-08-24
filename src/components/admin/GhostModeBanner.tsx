import { LogOut, Ghost } from 'lucide-react';
import { AccentButton } from '@/components/ui/button';
import { useGhostMode } from '@/hooks/useGhostMode';

export function GhostModeBanner() {
  const { session, isActive, exit } = useGhostMode();
  if (!isActive || !session) return null;

  const expiresAt = new Date(session.expiresAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      {/* Spacer to push content down */}
      <div className="h-12" />
      {/* Fixed banner below navbar area */}
      <div className="fixed inset-x-0 top-0 z-[998] border-b border-red-500/30 bg-gradient-to-r from-red-950/98 via-red-900/95 to-red-950/98 text-white backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center bg-red-500/20 border border-red-500/30">
              <Ghost className="h-4 w-4 text-red-300" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide">
                <span className="text-red-300">Ghost Mode:</span>{' '}
                <span className="text-white">{session.targetLabel}</span>
              </p>
              <p className="truncate text-[11px] text-red-200/70">
                Viewing as user · Expires {expiresAt}
              </p>
            </div>
          </div>
          <AccentButton
            size="sm"
            onClick={exit}
            className="shrink-0 bg-red-500/20 border-red-500/40 hover:bg-red-500/30 text-red-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Exit
          </AccentButton>
        </div>
      </div>
    </>
  );
}
