import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Flag,
  GripVertical,
  Layers3,
  Link2,
  MapPin,
  Sparkles,
  Trophy,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Tour step definitions (accurate to what's implemented)
// ─────────────────────────────────────────────────────────────────────────────

interface TourStep {
  /** Short label shown in the "Look at ↗" pill */
  area: string;
  /** Accent colour for the area pill */
  areaColor: string;
  title: string;
  body: string | string[];
  icon: typeof Sparkles;
}

const TOUR_STEPS: TourStep[] = [
  {
    area: 'Tournament Flow builder — Step 2 of 3',
    areaColor: 'text-cyan-400',
    icon: Sparkles,
    title: 'Welcome to the Tournament Flow Builder',
    body: "This is where you design the competitive circuit for your season. Each tournament in the circuit represents a real competition that will be created when you publish. You'll add tournaments, configure them (format, teams, dates), and wire advancement rules that connect them — defining exactly how teams move through the season.",
  },
  {
    area: 'Quick-add bar — above the canvas',
    areaColor: 'text-amber-400',
    icon: Flag,
    title: 'Adding Tournaments with Quick-Add',
    body: [
      "The three colored buttons at the top — Qualifier, Event, and Finals — instantly add a new tournament to your circuit.",
      "• Qualifier (amber) — an entry-level tournament; teams compete here to advance",
      "• Event (violet) — a major competition stop within the circuit",
      "• Finals (rose) — the closing championship where paths converge",
      "Each new tournament starts unnamed — the name field in the Inspector auto-focuses so you can type immediately. Add as many tournaments as your circuit requires.",
    ],
  },
  {
    area: 'Tournament role badge — on each canvas card',
    areaColor: 'text-violet-400',
    icon: Workflow,
    title: 'Tournament Roles: What Each One Means',
    body: [
      "Each tournament you add has a role, visible as a badge on its card:",
      "• Qualifier — Entry gate that filters who advances. Runs before the main event.",
      "• Event — A major competition stop within the circuit.",
      "• Finals — The closing destination where all qualifying paths converge.",
      "• Custom — Fully flexible. Use it for showmatches, boot camps, or anything non-standard.",
      "You can change the role at any time from the Inspector on the right.",
    ],
  },
  {
    area: 'Tournament canvas — left panel',
    areaColor: 'text-zinc-300',
    icon: Layers3,
    title: 'The Tournament Canvas',
    body: [
      "Every tournament you create appears in the canvas as a card. Each card shows:",
      "• The tournament name and role badge",
      "• Whether the tournament setup is complete (format, teams, etc.)",
      "• Advancement targets configured out of this tournament",
      "• Any scheduled dates",
      "Click any card to select it and load its settings into the Inspector on the right.",
    ],
  },
  {
    area: 'Inspector panel — right panel',
    areaColor: 'text-rose-400',
    icon: Sparkles,
    title: 'The Inspector Panel',
    body: "Click any tournament card to select it. The Inspector loads that tournament's full configuration — name, role, status, tournament setup (format, teams, registration), advancement rules, schedule, and location. This is where all real configuration happens.",
  },
  {
    area: 'Inspector → Name field',
    areaColor: 'text-white',
    icon: Sparkles,
    title: 'Naming Your Tournaments',
    body: [
      "Give every tournament a clear, descriptive name — players will see these names in the season overview.",
      "Good examples: 'South Asia Qualifier', 'EMEA Open', 'Grand Finals'",
      "When you first add a tournament, the name field auto-focuses so you can start typing immediately. Names can be changed at any time.",
    ],
  },
  {
    area: 'Inspector → Tournament setup section',
    areaColor: 'text-emerald-400',
    icon: Layers3,
    title: 'Tournament Setup',
    body: [
      "This is where you configure the real tournament that will be created when the season publishes.",
      "Required fields: Format, Registration type, Team size, Max teams, Best-of",
      "Optional: Entry fee, Prize pool, Check-in window",
      "A tournament is marked 'Ready' only when all required fields are filled. The builder validates this before letting you proceed.",
    ],
  },
  {
    area: 'Inspector → Advancement out section',
    areaColor: 'text-cyan-400',
    icon: Link2,
    title: 'Advancement Rules',
    body: [
      "Advancement rules define how teams move from this tournament to the next.",
      "• Choose a target tournament (must already exist in your circuit)",
      "• Pick a rule type: Top N teams, Top %, Points threshold, or Manual",
      "• Set the rule value (e.g. 4 for Top 4 teams)",
      "• Choose a seed mode for how teams are placed in the target bracket",
      "This is what creates the circuit — without advancement rules, tournaments are independent. One tournament can advance teams to multiple destinations.",
    ],
  },
  {
    area: 'Inspector → Registration / Starts / Ends fields',
    areaColor: 'text-violet-400',
    icon: CalendarRange,
    title: 'Scheduling Your Tournaments',
    body: [
      "Each tournament has its own independent schedule with three date fields:",
      "• Registration Deadline — When sign-ups close for this tournament",
      "• Starts — When the tournament officially begins",
      "• Ends — When the tournament concludes",
      "These dates appear in the season calendar so players can plan participation. Tournaments can run in parallel (overlapping dates) or sequentially.",
    ],
  },
  {
    area: 'Inspector → Region / City / Country fields',
    areaColor: 'text-emerald-400',
    icon: MapPin,
    title: 'Setting Location',
    body: "Each tournament can have its own Region, City, and Country. Useful when your circuit spans territories — e.g., South Asia Qualifier in Karachi, SEA Qualifier in Bangkok, Global Finals in Dubai. Location data appears in the season overview.",
  },
  {
    area: 'Inspector → Status dropdown',
    areaColor: 'text-amber-400',
    icon: Trophy,
    title: 'Tournament Status Lifecycle',
    body: [
      "Every tournament has a status you manage manually:",
      "• Draft — Not yet visible to players. Use this while building.",
      "• Scheduled — Visible to players. Registration opens soon.",
      "• Live — The tournament is actively running. Match data is being recorded.",
      "• Completed — The tournament is over. Results are locked.",
      "• Archived — Hidden from public view.",
      "The platform does not auto-update status — you control when each tournament transitions.",
    ],
  },
  {
    area: 'Continue button — bottom of the wizard',
    areaColor: 'text-rose-400',
    icon: CheckCircle2,
    title: "You're ready to build",
    body: [
      "That covers everything you need to build your season circuit.",
      "Every tournament must have its setup completed before you can proceed — look for the 'Ready' indicator on each card.",
      "When all tournaments are configured, click 'Continue' in the wizard to reach the final review step. You can always edit the structure after publishing from the season's management page → Structure tab.",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface SeasonBuilderTourProps {
  onClose: () => void;
}

const SeasonBuilderTour = ({ onClose }: SeasonBuilderTourProps) => {
  return (
    <TourInner onClose={onClose} />
  );
};

// Inner stateful component (keeps state local, avoids re-mounting parent)
const TourInner = ({ onClose }: { onClose: () => void }) => {
  // Using a module-level pattern so step persists between re-renders but
  // resets on each tour launch (component mount = fresh tour)
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const Icon = current.icon;

  const body = Array.isArray(current.body) ? current.body : [current.body];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[28px] border border-white/[0.09] bg-[#0d0d0f] shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
    >
      {/* Progress bar */}
      <div className="relative h-[3px] w-full overflow-hidden rounded-t-[28px] bg-white/[0.04]">
        <motion.div
          className="h-full rounded-full bg-rose-500"
          animate={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>

      <div className="p-6">
        {/* Area pill + step counter */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
            <span className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', current.areaColor)}>
              {current.area}
            </span>
          </div>
          <span className="font-body text-[11px] text-zinc-600">
            {step + 1} of {TOUR_STEPS.length}
          </span>
        </div>

        {/* Icon + Title */}
        <div className="mb-3 flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
            <Icon className="h-4 w-4 text-zinc-300" />
          </div>
          <AnimatePresence mode="wait">
            <motion.h3
              key={`title-${step}`}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="font-heading text-[18px] font-bold tracking-tight text-white"
            >
              {current.title}
            </motion.h3>
          </AnimatePresence>
        </div>

        {/* Body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`body-${step}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-1.5 pl-11"
          >
            {body.map((line, i) => {
              const isBullet = line.startsWith('•');
              return (
                <p
                  key={i}
                  className={cn(
                    'font-body text-[13px] leading-relaxed',
                    isBullet ? 'pl-2 text-zinc-400' : i === 0 ? 'text-zinc-300' : 'text-zinc-500',
                  )}
                >
                  {line}
                </p>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Step dots */}
        <div className="mt-5 flex items-center justify-between pl-11">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setStep(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === step
                    ? 'h-2 w-4 bg-rose-500'
                    : i < step
                      ? 'h-1.5 w-1.5 bg-zinc-600 hover:bg-zinc-400'
                      : 'h-1.5 w-1.5 bg-zinc-800 hover:bg-zinc-600',
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="font-body text-[12px] text-zinc-600 underline-offset-2 transition hover:text-zinc-400 hover:underline"
            >
              End tour
            </button>
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-rose-600"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.10]"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SeasonBuilderTour;
