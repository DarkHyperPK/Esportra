import type { ReactNode } from 'react';
import { StageBackground } from '@/components/ui/StageBackground';

interface CompetitivePageShellProps {
  children: ReactNode;
}

/**
 * Page-level shell for the competitive pages (Find Teammates, Scrims and the rest):
 * the stage ground (hairline grid, one cool light, grain) behind the content, so the
 * rosters, times and results sit on a lit stage instead of a flat fill.
 *
 * Layout-viewport rule: NO max-w-* or mx-auto on the outer shell.
 * Pages own their internal padding and column structure via children.
 */
export function CompetitivePageShell({ children }: CompetitivePageShellProps) {
  return (
    <div className="relative isolate min-h-[100dvh] w-full bg-[#09090b] text-white">
      <StageBackground />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
