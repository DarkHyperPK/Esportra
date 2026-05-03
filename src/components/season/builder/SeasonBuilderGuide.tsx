import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  CalendarRange,
  ChevronDown,
  Flag,
  Layers3,
  ListChecks,
  MapPin,
  RotateCcw,
  Settings2,
  Sparkles,
  Trophy,
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
    title: 'What is a Season?',
    paragraphs: [
      "A season is a multi-tournament competition flow. Every stage you add — qualifier, event, playoff, or final — is a real tournament with its own bracket, registration, and leaderboard.",
      "The Structure Builder is where you design the full competition path in one place. You add tournaments, configure them inline (format, team size, prize pool), and wire advancement so the top finishers automatically progress to the next tournament.",
      "Think of the season as a championship circuit: players enter through qualifiers, battle through events, and converge at a grand final. You design the full journey up front; the platform runs it.",
    ],
  },
  {
    id: 'stage-types',
    icon: Layers3,
    iconColor: 'text-violet-400',
    title: 'Tournament Roles',
    paragraphs: [
      "Every tournament inside a season has a role. The role describes what the tournament does in the overall flow:",
      {
        type: 'list',
        items: [
          'Qualifier (amber) — Open-entry tournament where new teams join. Typically feeds into an event or playoff.',
          'Event (violet) — Regional or circuit tournament. Can be fed from qualifiers or accept teams directly, depending on registration type.',
          'Finals (rose) — Terminal championship tournament. This is where the season ends and a champion is crowned.',
          'Custom (grey) — Flexible role for anything non-standard: showmatches, invitationals, last-chance qualifiers, or intermediate bracket rounds.',
        ],
      },
      "Roles are purely semantic — they help players understand the shape of your season. The actual mechanics (format, team size, registration, advancement) are set per tournament in the Inspector.",
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
          "Use the quick-add bar above the canvas (Qualifier, Event, Finals buttons) to add a tournament with that role.",
          "Click 'Add stage' inside any phase column to add another tournament of the same role.",
          "New tournaments start with an empty name and no config — the Inspector auto-focuses the name field so you can start typing immediately.",
        ],
      },
      "Removing a tournament:",
      {
        type: 'list',
        items: [
          "Select the tournament in the canvas, then click 'Remove' in the Inspector header.",
          "The season root cannot be removed.",
          "If the tournament being removed is a target of any advancement connection, that connection is invalidated and will show an error until you fix it.",
        ],
      },
    ],
  },
  {
    id: 'inline-config',
    icon: Settings2,
    iconColor: 'text-emerald-400',
    title: 'Configure Tournaments Inline',
    paragraphs: [
      "Each tournament in the season has its configuration defined right in the Inspector — no jumping to the standalone tournament creation flow.",
      "Required fields before you can publish:",
      {
        type: 'list',
        items: [
          'Format — single elimination, double elimination, round robin, Swiss, or groups → playoffs.',
          'Team size — the number of players per team (e.g. 5 for most FPS games).',
          'Max teams — the cap on registrations for this tournament.',
          'Registration type — open, invite-only, or qualifier-fed.',
        ],
      },
      "Optional but recommended: entry fee, prize pool, best-of per match, registration window, and check-in minutes. The Inspector shows a ‘Ready’ badge when the tournament has enough detail to be created on publish.",
    ],
  },
  {
    id: 'advancement',
    icon: ListChecks,
    iconColor: 'text-rose-400',
    title: 'Advancement Between Tournaments',
    paragraphs: [
      "Advancement is how teams move from one tournament to the next. You set it per-tournament in the Inspector under 'Advancement out'.",
      "Rule types:",
      {
        type: 'list',
        items: [
          'Top N — the top N finishers advance. Example: top 4 teams from the NA qualifier advance to the NA event.',
          'Top percentage — the top X% advance. Useful when team counts are uncertain.',
          'Points threshold — teams with at least X season points advance. Useful for circuits that accumulate points across multiple events.',
          'Manual selection — you pick the advancing teams yourself after the tournament completes.',
        ],
      },
      "Seed modes control how advancing teams are placed in the next tournament's bracket: preserve finishing order, reseed by season points, randomise, or seed manually. One tournament can have multiple outgoing advancement paths — for example, a qualifier could send top 4 to a main event and 5th–8th to a last-chance qualifier.",
    ],
  },
  {
    id: 'publishing',
    icon: Trophy,
    iconColor: 'text-cyan-400',
    title: 'Publishing the Season',
    paragraphs: [
      "When you publish a season, the platform creates every tournament you configured as a real tournament record and wires up the advancement connections between them. It is an end-to-end operation: you do not create tournaments separately and link them later.",
      "Before publish the platform validates:",
      {
        type: 'list',
        items: [
          'Every tournament has its required config fields filled in.',
          'The advancement graph has no cycles (no team can advance in a loop).',
          'Every non-Final tournament has at least one outgoing advancement path, or an explicit terminal setting.',
          'At least one Final or terminal tournament exists.',
        ],
      },
      "If a publish fails mid-way the entire operation rolls back — no half-created tournaments, no orphan advancement rules. After publish, you can still edit configuration on tournaments that have not started yet, but completed advancement cannot be rewritten without an audited manual override.",
    ],
  },
  {
    id: 'scheduling',
    icon: CalendarRange,
    iconColor: 'text-violet-400',
    title: 'Scheduling Your Stages',
    paragraphs: [
      "Each stage has three date fields: Registration Deadline, Start Date, and End Date. These are set independently for each stage.",
      {
        type: 'list',
        items: [
          "Registration Deadline — The last day players can sign up for this specific stage.",
          "Starts — The official start date of the stage.",
          "Ends — The official end date of the stage.",
        ],
      },
      "Stages can run in parallel (overlapping dates) or sequentially. The schedule is informational — it's displayed to players in the season calendar but does not automatically open or close registrations. Registration management is handled per-tournament.",
    ],
  },
  {
    id: 'status',
    icon: Trophy,
    iconColor: 'text-rose-400',
    title: 'Stage Status Lifecycle',
    paragraphs: [
      "Every stage has a status that you manage manually. The platform does not auto-update status.",
      {
        type: 'list',
        items: [
          "Draft — The stage is not yet visible to players. Use this while you're still building.",
          "Scheduled — The stage is visible. Players can see it in the season overview and start preparing.",
          "Live — The stage is actively running. Match results are being recorded.",
          "Completed — The stage is over. Results are locked.",
          "Archived — The stage is hidden from public view. Use for stages you want to preserve but not display.",
        ],
      },
      "Update the status of each stage as your season progresses. You can do this from the Inspector both during season creation and from the season management page (Structure tab) after the season is live.",
    ],
  },
  {
    id: 'location',
    icon: MapPin,
    iconColor: 'text-emerald-400',
    title: 'Stage Location',
    paragraphs: [
      "Each stage can have its own geographic details: Region, City, and Country. This is particularly useful for international seasons with stages across multiple territories.",
      "Examples:",
      {
        type: 'list',
        items: [
          "South Asia Qualifier → Region: South Asia, City: Karachi, Country: Pakistan",
          "Southeast Asia Qualifier → Region: Southeast Asia, City: Bangkok, Country: Thailand",
          "Grand Finals → Region: Global, City: Dubai, Country: UAE",
        ],
      },
      "Location data appears in the season overview and helps players identify which stages are geographically accessible or relevant to them.",
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

          {/* Cross-link to public organizer guide */}
          <a
            href="/guides/organizer#seasons"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
          >
            <div>
              <p className="font-body text-[12px] font-semibold text-zinc-200">Full reference: Seasons & Structure</p>
              <p className="font-body mt-0.5 text-[11px] text-zinc-500">Read the public organizer guide for the long-form walkthrough, including the Points rules tab.</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-400" />
          </a>
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default SeasonBuilderGuide;
