import { useState } from 'react';
import { Check } from 'lucide-react';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { TONE_DOT, TONE_TEXT, type Tone } from '@/components/ui/kit';
import { useOrganizerCardGameAssets } from '@/hooks/useOrganizerGameAssets';
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

/** Event art with the status pill, format chips and the game logo well. */
export function TournamentCardMedia({
  name, game, imageUrl, status, chips, loadGameArt, selectable, selected, onToggleSelect,
}: TournamentCardMediaProps) {
  const [customFailed, setCustomFailed] = useState(false);
  const assets = useOrganizerCardGameAssets(game, loadGameArt && (!imageUrl || customFailed));
  const isVideo = imageUrl?.includes('youtube.com/embed/');
  const src = (!customFailed && !isVideo && imageUrl)
    || assets.gameBanner || assets.cover || assets.rawgScreenshots[0] || assets.gameLogo || null;

  return (
    <div className="relative aspect-[16/8.2] overflow-hidden bg-[#0d0d10]">
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setCustomFailed(true)}
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] opacity-50 transition-[opacity,transform] duration-500 group-hover:scale-[1.03] group-hover:opacity-60 motion-reduce:transition-none"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-[#111114]/55 to-[#111114]/10" />

      <div className="absolute inset-x-3.5 top-3.5 flex items-start justify-between gap-2">
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
          <span className={cn('inline-flex h-6 items-center gap-2 bg-black/80 px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] backdrop-blur-sm', TONE_TEXT[status.tone])}>
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

      <div className="absolute -bottom-px left-3.5 flex h-[46px] w-[46px] items-center justify-center bg-background p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
        <GameLogoImage gameName={game} alt={`${game} logo`} className="max-h-full max-w-full object-contain" />
      </div>
    </div>
  );
}
