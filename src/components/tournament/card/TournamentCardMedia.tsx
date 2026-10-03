import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { TONE_DOT, TONE_TEXT, type Tone } from '@/components/ui/kit';
import { useOrganizerCardGameAssets } from '@/hooks/useOrganizerGameAssets';
import { getBundledGameAssets } from '@/hooks/useRawgGame';
import { cn } from '@/lib/utils';

interface TournamentCardMediaProps {
  name: string;
  game: string;
  imageUrl?: string | null;
  status: { label: string; tone: Tone };
  chips: string[];
  loadGameArt: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

/** A YouTube banner shows its thumbnail; anything else is used as given. */
function customArt(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const video = imageUrl.match(/youtube\.com\/embed\/([\w-]{6,})/);
  return video ? `https://i.ytimg.com/vi/${video[1]}/hqdefault.jpg` : imageUrl;
}

/** Event art with the status pill, format chips and the game logo well. */
export function TournamentCardMedia({
  name, game, imageUrl, status, chips, loadGameArt, selectable, selected, onToggleSelect,
}: TournamentCardMediaProps) {
  const custom = customArt(imageUrl);
  const [failed, setFailed] = useState<string[]>([]);
  const customUsable = Boolean(custom && !failed.includes(custom));
  const assets = useOrganizerCardGameAssets(game, loadGameArt && !customUsable);
  // Bundled art needs no network, so it also covers lite lists and offline APIs.
  const bundled = useMemo(() => getBundledGameAssets(game), [game]);
  const candidates = [
    custom, assets.gameBanner, assets.cover, assets.rawgScreenshots[0],
    bundled?.gameBanner, bundled?.cover, assets.gameLogo,
  ].filter((value): value is string => Boolean(value));
  const src = candidates.find((candidate) => !failed.includes(candidate)) ?? null;

  return (
    <div className="relative h-32 overflow-hidden bg-[#0d0d10] sm:h-36">
      {src ? (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          sizes="(min-width: 1536px) 25vw, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          onError={() => setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]))}
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] opacity-60 transition-[opacity,transform] duration-500 group-hover/card:scale-[1.03] group-hover/card:opacity-75 motion-reduce:transition-none"
        />
      ) : (
        // No art reachable: a lit stage with the game's own mark, never an empty box.
        <div aria-hidden className="bracket-canvas absolute inset-0 flex items-center justify-end pr-6">
          <GameLogoImage gameName={game} className="h-24 w-24 object-contain opacity-30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-[#111114]/40 to-transparent" />

      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {selectable && (
            <button
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`Select ${name}`}
              onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}
              className={cn(
                'relative z-10 flex h-[18px] w-[18px] items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                selected ? 'bg-white text-matte-black' : 'bg-black/60 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]',
              )}
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} aria-hidden />}
            </button>
          )}
          <span className={cn('inline-flex h-6 items-center gap-2 bg-black/85 px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]', TONE_TEXT[status.tone])}>
            <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[status.tone])} />
            {status.label}
          </span>
        </div>
        {chips.length > 0 && (
          <div className="flex gap-1.5">
            {chips.map((c) => (
              <span key={c} className="inline-flex h-6 items-center bg-black/75 px-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-zinc-300 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="absolute -bottom-px left-3 flex h-10 w-10 items-center justify-center bg-background p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
        <GameLogoImage gameName={game} alt={`${game} logo`} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );
}
