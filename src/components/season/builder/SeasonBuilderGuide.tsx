import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarRange,
  ChevronDown,
  Flag,
  Layers3,
  Link2,
  MapPin,
  RotateCcw,
  Sparkles,
  Trophy,
  Workflow,
  X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Guide chapters — accurate to what's implemented
// ─────────────────────────────────────────────────────────────────────────────

interface GuideSection {
  id: string;
  icon: typeof Sparkles;
  iconColor: string;
  title: string;
  paragraphs: (string | { type: 'list'; items: string[] })[];
}

const GUIDE_CHAPTERS: GuideSection[] = [
  {
    id: 'overview',
    icon: Sparkles,
    iconColor: 'text-cyan-400',
    title: 'What is a Season Structure?',
    paragraphs: [
      "A season in Esportra is a designed competitive circuit — a structured pathway that takes players from entry-level tournaments through to a championship.",
      "The Structure Builder is where you define that circuit. You add tournaments, configure them with real format and registration settings, and wire advancement rules that define how teams move from one tournament to the next.",
      "Think of the structure as a flow: your season root connects to qualifiers, qualifiers advance top teams to events, events advance top teams to finals. Every connection is an explicit advancement rule.",
    ],
  },
  {
    id: 'stage-types',
    icon: Layers3,
    iconColor: 'text-violet-400',
    title: 'Tournament Roles Explained',
    paragraphs: [
      "Every tournament you add has a role. Here's what each role means:",
      {
        type: 'list',
        items: [
          'Qualifier (amber) — Entry-level competitions. Players compete here to earn a spot in the next tournament. Example: a regional open qualifier or online sub-regional.',
          "Event (violet) — A major competition stop within the season. Teams typically advance from a qualifier into an event.",
          'Finals (rose) — The closing championship tournament where all qualifying paths converge. Typically one per season.',
          'Custom (grey) — Fully flexible. Use for anything non-standard: showmatches, boot camps, pre-season invitationals, or intermediate rounds.',
        ],
      },
      "You can change the role of any tournament at any time from the Inspector. Roles affect how tournaments are categorised and displayed to players — they do not enforce automatic logic.",
    ],
  },
  {
    id: 'adding-stages',
    icon: Flag,
    iconColor: 'text-amber-400',
    title: 'Adding & Removing Tournaments',
    paragraphs: [
      "Adding a tournament:",
      {
        type: 'list',
        items: [
          "Use the quick-add bar above the canvas (Qualifier, Event, Finals buttons) to instantly add a tournament to the flow.",
          "New tournaments start with an empty name — the Inspector's name field will auto-focus so you can type immediately.",
          "You can also use 'Add child' or 'Add sibling' buttons in the Inspector to add relative to the currently selected tournament.",
        ],
      },
      "Removing a tournament:",
      {
        type: 'list',
        items: [
          "Select the tournament in the canvas, then click 'Remove' in the Inspector header.",
          "The root node (your season itself) cannot be removed.",
          "If you remove a tournament that has connected children, those are automatically re-linked to the removed tournament's parent — no orphaned nodes.",
        ],
      },
    ],
  },
  {
    id: 'tournament-setup',
    icon: Layers3,
    iconColor: 'text-emerald-400',
    title: 'Tournament Setup',
    paragraphs: [
      "Each tournament is configured inline in the Inspector. This is where you define the real tournament that will be created when the season is published.",
      "Available fields include:",
      {
        type: 'list',
        items: [
          'Format — single elimination, double elimination, round robin, swiss, or groups + playoffs',
          'Registration type — open, invite-only, or qualifier feed',
          'Team size — players per team',
          'Max teams — hard cap on entries',
          'Best of — match series format',
          'Entry fee and prize pool',
        ],
      },
      "A tournament is considered ready only when the required setup is complete. The builder uses that readiness state during validation before allowing the season flow to continue.",
    ],
  },
  {
    id: 'advancement',
    icon: Link2,
    iconColor: 'text-cyan-400',
    title: 'Advancement Rules',
    paragraphs: [
      "Advancement rules define how teams move from one tournament to the next.",
      "How it works:",
      {
        type: 'list',
        items: [
          "Select a tournament in the canvas.",
          "In the Inspector, open the 'Advancement out' section.",
          "Add a target tournament.",
          "Choose the rule type, rule value, and seed mode.",
        ],
      },
      "Available rule types:",
      {
        type: 'list',
        items: [
          'Top N teams',
          'Top percentage',
          'Points threshold',
          'Manual selection',
        ],
      },
      "This is what turns the season from a list of tournaments into a connected competition circuit.",
    ],
  },
  {
    id: 'scheduling',
    icon: CalendarRange,
    iconColor: 'text-violet-400',
    title: 'Scheduling Your Tournaments',
    paragraphs: [
      "Each tournament has three date fields: Registration Deadline, Start Date, and End Date. These are set independently for each tournament.",
      {
        type: 'list',
        items: [
          "Registration Deadline — The last day players can sign up for this specific tournament.",
          "Starts — The official start date of the tournament.",
          "Ends — The official end date of the tournament.",
        ],
      },
      "Tournaments can run in parallel (overlapping dates) or sequentially. The schedule is informational — it's displayed to players in the season calendar but does not automatically open or close registrations. Registration management is handled per tournament.",
      "You can also set Region, City, and Country per tournament — useful for seasons that span multiple territories.",
    ],
  },
  {
    id: 'status',
    icon: Trophy,
    iconColor: 'text-rose-400',
    title: 'Tournament Status Lifecycle',
    paragraphs: [
      "Every tournament has a status that you manage manually. The platform does not auto-update status.",
      {
        type: 'list',
        items: [
          "Draft — The tournament is not yet visible to players. Use this while you're still building.",
          "Scheduled — The tournament is visible. Players can see it in the season overview and start preparing.",
          "Live — The tournament is actively running. Match results are being recorded.",
          "Completed — The tournament is over. Results are locked.",
          "Archived — The tournament is hidden from public view. Use for tournaments you want to preserve but not display.",
        ],
      },
      "Update the status of each tournament as your season progresses. You can do this from the Inspector during season creation, and from the season management page (Structure tab) after the season is live.",
    ],
  },
  {
    id: 'location',
    icon: MapPin,
    iconColor: 'text-emerald-400',
    title: 'Tournament Location',
    paragraphs: [
      "Each tournament can have its own geographic details: Region, City, and Country. This is particularly useful for international seasons with tournaments across multiple territories.",
      "Examples:",
      {
        type: 'list',
        items: [
          "South Asia Qualifier → Region: South Asia, City: Karachi, Country: Pakistan",
          "Southeast Asia Qualifier → Region: Southeast Asia, City: Bangkok, Country: Thailand",
          "Grand Finals → Region: Global, City: Dubai, Country: UAE",
        ],
      },
      "Location data appears in the season overview and helps players identify which tournaments are geographically accessible or relevant to them.",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface SeasonBuilderGuideProps {
  onClose: () => void;
  onStartTour: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Accordion chapter item
// ─────────────────────────────────────────────────────────────────────────────

const ChapterItem = ({ chapter }: { chapter: GuideSection }) => {
  const [open, setOpen] = useState(false);
  const Icon = chapter.icon;

  return (
    <div className={cn('rounded-2xl border transition-all', open ? 'border-white/10 bg-white/[0.03]' : 'border-white/[0.05] bg-transparent hover:border-white/[0.08]')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02]')}>
          <Icon className={cn('h-3.5 w-3.5', chapter.iconColor)} />
        </div>
        <span className="flex-1 font-body text-[13px] font-semibold text-zinc-200">{chapter.title}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-zinc-600 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 px-4 pb-4 pt-1">
              {chapter.paragraphs.map((p, i) => {
                if (typeof p === 'string') {
                  return (
                    <p key={i} className="font-body text-[12.5px] leading-relaxed text-zinc-400">
                      {p}
                    </p>
                  );
                }
                return (
                  <ul key={i} className="space-y-1.5 pl-2">
                    {p.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                        <span className="font-body text-[12.5px] leading-relaxed text-zinc-400">{item}</span>
                      </li>
                    ))}
                  </ul>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main guide component
// ─────────────────────────────────────────────────────────────────────────────

const SeasonBuilderGuide = ({ onClose, onStartTour }: SeasonBuilderGuideProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col rounded-[28px] border border-white/[0.08] bg-[#0c0c0e] shadow-[0_32px_80px_rgba(0,0,0,0.6)]"
    >
      {/* Header */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <p className="font-body text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-600">
            Reference guide
          </p>
          <h3 className="font-heading mt-1 text-[17px] font-bold text-white">How it works</h3>
          <p className="font-body mt-0.5 text-[12px] text-zinc-500">
            Everything about the season structure builder.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300"
          aria-label="Close guide"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Take the tour prompt */}
      <div className="shrink-0 border-b border-white/[0.06] px-5 py-3.5">
        <button
          type="button"
          onClick={() => { onClose(); onStartTour(); }}
          className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-2.5 text-left transition hover:bg-rose-500/[0.10]"
        >
          <div className="flex items-center gap-2.5">
            <RotateCcw className="h-4 w-4 text-rose-400" />
            <div>
              <p className="font-body text-[12px] font-semibold text-rose-300">Interactive tour</p>
              <p className="font-body text-[11px] text-rose-400/60">Step-by-step walkthrough of the builder</p>
            </div>
          </div>
          <span className="font-body text-[11px] font-medium text-rose-400">Start →</span>
        </button>
      </div>

      {/* Chapters */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {GUIDE_CHAPTERS.map((chapter) => (
            <ChapterItem key={chapter.id} chapter={chapter} />
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default SeasonBuilderGuide;
