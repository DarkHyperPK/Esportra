import type { ReactNode } from 'react';

// ─── Brand constant — copy of NOISE_BG from ProductSidebar (not exported there) ──
// Values: baseFrequency=0.9, numOctaves=4, stitchTiles=stitch, backgroundSize 128px
const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C%2Ffilter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C%2Fsvg%3E")`;

interface CompetitivePageShellProps {
  children: ReactNode;
}

/**
 * Page-level shell for all 16 competitive pages.
 * Provides stage-black background, static rose top glow, bottom bleed, and
 * 7% fractalNoise texture — matching the ProductSidebar material language.
 *
 * Layout-viewport rule: NO max-w-* or mx-auto on the outer shell.
 * Pages own their internal padding and column structure via children.
 */
export function CompetitivePageShell({ children }: CompetitivePageShellProps) {
  return (
    <div
      className="relative w-full min-h-[100dvh] text-white"
      style={{ backgroundColor: '#08080a' }}
    >
      {/* Top rose glow — static; 40% ellipse on wide canvas ≈ sidebar absolute spread */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 35% at 50% 0%, rgba(244,63,94,0.18) 0%, transparent 65%)',
        }}
      />

      {/* Bottom rose bleed */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(244,63,94,0.10) 0%, transparent 70%)',
        }}
      />

      {/* Noise texture — 7% opacity fractalNoise, 128px tile */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: NOISE_BG, backgroundSize: '128px 128px' }}
      />

      {/* Content layer — sits above all absolute decorative layers */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
}
