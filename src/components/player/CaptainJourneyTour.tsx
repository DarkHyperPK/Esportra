import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserPlus, Gamepad2, Trophy, Radio, Swords, Crown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CaptainJourneyTourProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Shield,
    title: 'Build Your Identity',
    subtitle: 'Your team starts here.',
    bullets: [
      <>Choose a team name and a <b>3–6 character tag</b> shown in every match</>,
      <>Upload your team logo and select your country</>,
      <>You'll be set as <b>Captain</b> automatically — you control the roster, invites, and registrations</>,
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.08) 0%, transparent 60%)',
  },
  {
    icon: UserPlus,
    title: 'Recruit Your Squad',
    subtitle: 'No captain fights alone.',
    bullets: [
      <>Search players by <b>username or email</b> and send invites</>,
      <>Invited players get a <b>real-time notification</b> and can accept from their Teams page</>,
      <>Assign each member as a <b>Starter</b>, <b>Bench</b>, or <b>Coach</b></>,
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)',
  },
  {
    icon: Gamepad2,
    title: 'Set Up Game Rosters',
    subtitle: 'One team, multiple games.',
    bullets: [
      <>Create up to <b>3 game-specific rosters</b> — Valorant, CS2, League of Legends, Tekken 8, and more</>,
      <>Assign members as <b>Starters or Bench</b> — 5v5 games get 5 starters + 2 subs</>,
      <>Your roster must meet the <b>minimum player count</b> before you can register for a tournament</>,
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 60%)',
  },
  {
    icon: Trophy,
    title: 'Enter a Tournament',
    subtitle: 'Time to compete.',
    bullets: [
      <>Browse tournaments by <b>game, format</b> (Online/LAN), and <b>region</b></>,
      <>Select your team and the <b>matching game roster</b> to register</>,
      <>For paid tournaments, upload your <b>payment receipt</b> — free tournaments approve instantly</>,
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08) 0%, transparent 60%)',
  },
  {
    icon: Radio,
    title: 'Check In & Go Live',
    subtitle: 'Match day is here.',
    bullets: [
      <>A <b>check-in window opens 15 minutes</b> before your scheduled match</>,
      <>Both teams must check in — if your opponent doesn't show, you get an <b>automatic walkover</b></>,
      <>Once both teams are ready, enter the <b>party/lobby code</b> and get into the game</>,
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 60%)',
  },
  {
    icon: Swords,
    title: 'Report Results',
    subtitle: 'Play it out.',
    bullets: [
      <>For BO1/BO3/BO5 matches, captains take turns <b>banning and picking maps</b> in a live veto</>,
      <>After each game, <b>report your scores</b> and upload <b>screenshots</b> as proof</>,
      <>If something's wrong, file a <b>dispute with evidence</b> — the organizer will resolve it</>,
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.08) 0%, transparent 60%)',
  },
  {
    icon: Crown,
    title: 'Climb the Bracket',
    subtitle: 'Victory awaits.',
    bullets: [
      <>Win your matches to advance through the <b>single or double elimination bracket</b></>,
      <>Track your progress, upcoming opponents, and standings <b>in real time</b></>,
      <>Every result, every match — it all happens right here on Esportra. <b>Good luck, Captain.</b></>,
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.12) 0%, transparent 60%)',
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export default function CaptainJourneyTour({ onComplete }: CaptainJourneyTourProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const isLast = current === slides.length - 1;
  const isFirst = current === 0;

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setDirection(1);
    setCurrent(prev => prev + 1);
  }, [isLast, onComplete]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setCurrent(prev => prev - 1);
  }, [isFirst]);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-[#0a0a0c] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Skip button */}
        <button
          onClick={onComplete}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step counter */}
        <div className="absolute top-5 left-6 text-[11px] font-medium tracking-widest uppercase text-white/30">
          {current + 1} of {slides.length}
        </div>

        {/* Slide content */}
        <div className="relative min-h-[420px] flex flex-col items-center" style={{ background: slide.gradient }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col items-center text-center px-8 pt-16 pb-6 w-full"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.3, delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mb-6 p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20"
              >
                <Icon className="w-10 h-10 text-rose-400" strokeWidth={1.5} />
              </motion.div>

              {/* Title */}
              <h2 className="text-2xl font-heading font-bold text-white mb-1.5 tracking-wide">
                {slide.title}
              </h2>

              {/* Subtitle */}
              <p className="text-white/40 text-sm font-medium mb-6 italic">
                {slide.subtitle}
              </p>

              {/* Bullets */}
              <ul className="space-y-3 text-left max-w-sm w-full">
                {slide.bullets.map((bullet, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="flex items-start gap-3 text-[13px] leading-relaxed text-white/60"
                  >
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-500 shrink-0" />
                    <span className="[&>b]:text-white/90 [&>b]:font-medium">{bullet}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: dots + navigation */}
        <div className="px-6 pb-6 pt-2 flex flex-col items-center gap-5">
          {/* Dots */}
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 bg-rose-500'
                    : 'w-1.5 bg-white/15 hover:bg-white/25'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between w-full gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={isFirst}
              className="text-white/40 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none h-10 px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <Button
              size="sm"
              onClick={goNext}
              className="h-10 px-6 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-heading font-semibold uppercase tracking-wider text-xs rounded-full shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] transition-all"
            >
              {isLast ? (
                "I'm Ready, Let's Go!"
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
