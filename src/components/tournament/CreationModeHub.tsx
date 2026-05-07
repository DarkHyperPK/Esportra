import { useEffect, useState } from 'react';
import { ArrowRight, Trophy, Workflow } from 'lucide-react';
import { fetchGameData, type CachedGame } from '@/hooks/useRawgGame';

type CreationMode = 'event' | 'season';

interface CreationModeHubProps {
  onSelect: (mode: CreationMode) => void;
}

const useHubMedia = (): string | undefined => {
  const [media, setMedia] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    const pick = (d: CachedGame) =>
      d.screenshots[0] ?? d.gameBanner ?? d.cover ?? undefined;

    void (async () => {
      try {
        const eventData = await fetchGameData('Valorant', { skipRawg: true });
        if (alive) setMedia(pick(eventData));
      } catch {
        // decorative — fail silently
      }
    })();

    return () => { alive = false; };
  }, []);

  return media;
};

interface PanelDef {
  mode: CreationMode;
  title: string;
  tagline: string;
  points: string[];
  accent: string;
  icon: typeof Trophy;
  btnClass: string;
  dotClass: string;
}

const PANELS: PanelDef[] = [
  {
    mode: 'event',
    title: 'Tournament',
    tagline: 'A single, self-contained competition from setup to results.',
    points: [
      'Groups, brackets, or custom stage formats',
      'Registration, check-in, and participant management',
      'Match operations, veto, and live results',
    ],
    accent: 'text-rose-400',
    icon: Trophy,
    btnClass: 'bg-rose-500 hover:bg-rose-400 text-white',
    dotClass: 'bg-rose-400',
  },
  {
    mode: 'season',
    title: 'Season',
    tagline: 'A series of connected tournaments with point standings.',
    points: [
      'Link multiple tournaments into a season',
      'Track team standings across events',
      'Set point rules and advancement criteria',
    ],
    accent: 'text-emerald-400',
    icon: Workflow,
    btnClass: 'bg-emerald-500 hover:bg-emerald-400 text-white',
    dotClass: 'bg-emerald-400',
  },
];

const CreationModeHub = ({ onSelect }: CreationModeHubProps) => {
  const [active, setActive] = useState<CreationMode | null>(null);
  const media = useHubMedia();

  return (
    <div className="flex min-h-screen flex-col bg-[#050505]">
      {/* Top strip */}
      <div className="flex items-center justify-center border-b border-white/[0.05] px-8 py-4">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.3em] text-zinc-400">
          Create tournament
        </p>
      </div>

      {/* Split panels */}
      <div className="flex flex-1 flex-col sm:flex-row">
        {PANELS.map(({ mode, title, tagline, points, accent, icon: Icon, btnClass, dotClass }) => {
          const isActive = active === mode;
          const image = media;

          return (
            <div
              key={mode}
              role="button"
              tabIndex={0}
              aria-label={`Create ${title}`}
              onClick={() => onSelect(mode)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(mode); }
              }}
              onMouseEnter={() => setActive(mode)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(mode)}
              onBlur={() => setActive(null)}
              className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border-r border-white/[0.04] last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              style={{
                minHeight: 'calc(100dvh - 52px)',
                opacity: isActive ? 1 : 0.8,
                transition: 'opacity 0.2s ease',
              }}
            >
              {/* Background image */}
              {image && (
                <img
                  src={image}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: isActive ? 0.45 : 0.14,
                    scale: isActive ? '1.04' : '1',
                    transition: 'opacity 0.5s ease, scale 0.6s ease',
                  }}
                />
              )}

              {/* Dark overlay — reduced to /70 so image bleeds through */}
              <div className="absolute inset-0 bg-[#050505]/70" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 via-transparent to-[#050505]/80" />

              {/* Content */}
              <div
                className="relative z-10 flex flex-col items-center px-8 py-16 text-center"
                style={{
                  transform: isActive ? 'translateY(-14px)' : 'translateY(0)',
                  transition: 'transform 0.3s ease',
                }}
              >
                <div className="mb-7">
                  <Icon className={`h-7 w-7 ${accent}`} />
                </div>

                <h2 className="font-heading text-[clamp(48px,6.5vw,84px)] font-bold leading-none tracking-[-0.045em] text-white">
                  {title}
                </h2>

                <p className="font-body mt-5 max-w-[240px] text-[13px] leading-[1.7] text-zinc-400">
                  {tagline}
                </p>

                {/* Reveal panel */}
                <div
                  className="mt-10 flex w-full max-w-[220px] flex-col items-center overflow-hidden"
                  style={{
                    maxHeight: isActive ? '200px' : '0',
                    opacity: isActive ? 1 : 0,
                    transition: 'max-height 0.25s ease, opacity 0.2s ease',
                  }}
                >
                  <ul className="w-full space-y-3 text-left">
                    {points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5">
                        <span className={`mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full ${dotClass}`} />
                        <span className="font-body text-[12px] leading-[1.65] text-zinc-300">{pt}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`mt-7 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold transition-colors duration-150 ${btnClass}`}
                  >
                    Begin setup
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom strip */}
      <div className="border-t border-white/[0.05] px-8 py-3.5">
        <p className="font-body text-[11px] text-zinc-700">
          All game titles and participant formats supported.
        </p>
      </div>
    </div>
  );
};

export default CreationModeHub;
