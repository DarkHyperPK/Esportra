import { motion } from 'framer-motion';
import { ArrowRight, CalendarRange, Layers3, Sparkles, Trophy, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRawgGame } from '@/hooks/useRawgGame';

type CreationMode = 'event' | 'season';

interface CreationModeHubProps {
  onSelect: (mode: CreationMode) => void;
}

interface CreationCardProps {
  mode: CreationMode;
  title: string;
  eyebrow: string;
  description: string;
  cta: string;
  gameName: string;
  accentClasses: string;
  statLabel: string;
  statValue: string;
  bullets: string[];
  onSelect: (mode: CreationMode) => void;
}

const CreationCard = ({
  mode,
  title,
  eyebrow,
  description,
  cta,
  gameName,
  accentClasses,
  statLabel,
  statValue,
  bullets,
  onSelect,
}: CreationCardProps) => {
  const gameData = useRawgGame(gameName, { skipRawg: true });
  const hero = gameData.screenshots[1] || gameData.screenshots[0] || gameData.gameBanner || gameData.gameLogo;
  const cover = gameData.cover || gameData.gameLogo;
  const Icon = mode === 'event' ? Trophy : Workflow;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(mode)}
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="group relative min-h-[540px] overflow-hidden rounded-[32px] border border-white/10 bg-black/30 text-left shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
    >
      {hero ? (
        <img
          src={hero}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[8s] ease-out group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-zinc-900" />
      )}

      <div className={`absolute inset-0 bg-gradient-to-br ${accentClasses}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_35%)] opacity-70" />

      <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Badge className="border-0 bg-white/12 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-white/80 hover:bg-white/12">
                {eyebrow}
              </Badge>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/35 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-white">{title}</h2>
                  <p className="text-sm text-white/60">{gameName} IGDB-inspired artwork</p>
                </div>
              </div>
            </div>

            {cover ? (
              <img
                src={cover}
                alt={`${gameName} cover`}
                className="h-24 w-16 rounded-2xl border border-white/15 object-cover shadow-2xl"
              />
            ) : null}
          </div>

          <p className="max-w-xl text-base leading-7 text-white/80">{description}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/12 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{statLabel}</p>
              <p className="mt-2 text-2xl font-bold text-white">{statValue}</p>
            </div>
            <div className="rounded-2xl border border-white/12 bg-black/30 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Best for</p>
              <p className="mt-2 text-sm font-medium text-white/85">
                {mode === 'event' ? 'Standalone tournaments with stages' : 'Linked qualifiers and finals'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {bullets.map((bullet) => (
              <div key={bullet} className="rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white/75">
                {bullet}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-[28px] border border-white/12 bg-black/35 p-4">
            <div>
              <p className="text-sm font-semibold text-white">{cta}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/45">
                {mode === 'event' ? 'Current multi-stage wizard' : 'Season tree setup wizard'}
              </p>
            </div>

            <Button className="border-0 bg-white text-black hover:bg-white/90">
              Open
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

const CreationModeHub = ({ onSelect }: CreationModeHubProps) => {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-black/35 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-8 lg:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_32%)]" />

        <div className="relative z-10">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white/70">
              <Sparkles className="h-3.5 w-3.5" />
              Creation hub
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Choose how this competition should scale
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/65 md:text-base">
              Start from one premium entry point. Launch a single-event tournament with stages, or build a full season
              tree that connects qualifiers, checkpoints, and finals.
            </p>
          </div>

          <div className="relative grid gap-6 lg:grid-cols-2">
            <CreationCard
              mode="event"
              title="Single Event"
              eyebrow="One tournament"
              description="Run one tournament with multiple stages, brackets, schedules, check-in, veto, and match operations inside a single event shell."
              cta="Launch single-event wizard"
              gameName="Valorant"
              accentClasses="from-[#5b21b6]/55 via-[#1d4ed8]/30 to-black/60"
              statLabel="Structure"
              statValue="Multi-stage"
              bullets={['Groups + playoffs', 'One registration pool', 'Best for weekend events']}
              onSelect={onSelect}
            />

            <CreationCard
              mode="season"
              title="Season"
              eyebrow="Multi-event circuit"
              description="Connect multiple tournaments into one season tree, route winners into downstream rounds, track standings, and manage qualification workflows."
              cta="Launch season builder"
              gameName="Counter-Strike 2"
              accentClasses="from-[#0f172a]/45 via-[#0f766e]/28 to-black/70"
              statLabel="Structure"
              statValue="Multi-event"
              bullets={['City qualifiers -> finals', 'Shared standings', 'Qualification automation']}
              onSelect={onSelect}
            />

            <div className="pointer-events-none absolute inset-y-8 left-1/2 hidden -translate-x-1/2 items-center lg:flex">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-black/65 text-white shadow-2xl backdrop-blur-xl">
                <Layers3 className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/55">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <CalendarRange className="h-4 w-4" />
              Event flow for single tournaments
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Workflow className="h-4 w-4" />
              Season flow for linked competitions
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <ArrowRight className="h-4 w-4" />
              Both start from the same route
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreationModeHub;

