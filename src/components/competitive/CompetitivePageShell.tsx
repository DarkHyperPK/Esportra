import type { ReactNode } from 'react';

interface CompetitivePageShellProps {
  children: ReactNode;
}

/**
 * Page-level shell for the competitive pages: one flat, near-black ground.
 * No glow, texture or gradient: hierarchy comes from surfaces and type, so
 * the content (rosters, times, results) is what the eye lands on.
 *
 * Layout-viewport rule: NO max-w-* or mx-auto on the outer shell.
 * Pages own their internal padding and column structure via children.
 */
export function CompetitivePageShell({ children }: CompetitivePageShellProps) {
  return <div className="relative min-h-[100dvh] w-full bg-[#09090b] text-white">{children}</div>;
}
