/**
 * ScoutingHeader
 *
 * The team's banner: art, crest, name, tag and region, game and series format.
 * Rendered inside the dialog, so the name is the dialog's accessible title.
 */

import { GameLogoImage } from '@/components/games/GameLogoImage';
import { DialogTitle } from '@/components/ui/dialog';

interface ScoutingHeaderProps {
  name: string;
  logoUrl: string | null;
  /** Captain card art when there is one; otherwise the logo is blurred into a banner. */
  bannerUrl: string | null;
  isCardArt: boolean;
  tag: string | null | undefined;
  region: string | null | undefined;
  gameSlug: string | null;
  gameName: string | null;
  gameLogo?: string | null;
  seriesLabel: string | null;
}

export function ScoutingHeader(p: ScoutingHeaderProps) {
  return (
    <div className="relative h-[148px] shrink-0 overflow-hidden bg-white/[0.03]">
      {p.bannerUrl && p.isCardArt ? (
        <img
          src={p.bannerUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'brightness(0.55) saturate(1.05)', opacity: 0.7 }}
        />
      ) : null}
      {p.isCardArt && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-card via-card/55 to-transparent" />}

      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-white/[0.12] bg-black/60 px-2.5 py-1.5">
        {p.gameSlug && <GameLogoImage gameName={p.gameSlug} catalogLogo={p.gameLogo ?? undefined} className="h-5 w-5 object-contain" />}
        <span className="text-[11px] font-medium text-white/75">{p.gameName ?? p.gameSlug ?? 'Scrim'}</span>
      </div>

      <div className="absolute inset-x-5 bottom-4 flex items-end gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.18] bg-zinc-800 font-mono text-[16px] font-semibold text-white/70 shadow-lg">
          {p.logoUrl ? <img src={p.logoUrl} alt="" className="h-full w-full object-cover" /> : p.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 pb-0.5">
          <DialogTitle className="truncate font-heading text-[22px] font-bold normal-case leading-tight tracking-normal text-white">{p.name}</DialogTitle>
          <p className="truncate text-[12px] text-white/60">
            {[p.tag, p.region?.toUpperCase()].filter(Boolean).join(' · ')}
          </p>
        </div>
        {p.seriesLabel && (
          <span className="mb-1 ml-auto shrink-0 rounded-full border border-white/[0.14] bg-black/50 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.14em] text-white/75">
            {p.seriesLabel}
          </span>
        )}
      </div>
    </div>
  );
}
