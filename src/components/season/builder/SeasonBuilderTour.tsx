import { useMemo } from 'react';
import {
  ArrowRightCircle,
  BarChart3,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  Flag,
  Layers3,
  ListChecks,
  MapPin,
  PlayCircle,
  Settings2,
  Sparkles,
  Trophy,
  Workflow,
} from 'lucide-react';
import SpotlightTour, { type SpotlightStep } from '@/components/onboarding/SpotlightTour';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonBuilderTourSurface = 'wizard' | 'manage';

interface SeasonBuilderTourProps {
  open: boolean;
  surface: SeasonBuilderTourSurface;
  onClose: () => void;
  /**
   * Called before steps that require a stage to be selected. Receiver should
   * select the first non-root stage (if any) so the Inspector becomes visible.
   */
  onRequireStageSelected?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step content (truthful — every claim verified against the implementation)
// ─────────────────────────────────────────────────────────────────────────────

const buildSteps = (
  surface: SeasonBuilderTourSurface,
  onRequireStageSelected?: () => void,
): SpotlightStep[] => {
  const areaPrefix = surface === 'wizard' ? 'Step 2 of 3' : 'Structure tab';
  const outroCopy =
    surface === 'wizard'
      ? [
          "That covers everything in the Structure builder.",
          "Click Continue to review your season and publish — all tournaments will be created at once.",
          "You can always come back from the season's management page → Structure tab.",
        ]
      : [
          "That covers everything in the Structure builder.",
          "Press Save structure when you're happy with your changes.",
          "The Points rules tab is where you shape season-wide leaderboards. Stage-to-stage advancement lives in the Inspector.",
        ];

  return [
    {
      id: 'welcome',
      anchorId: null,
      area: areaPrefix,
      areaColor: 'text-cyan-400',
      icon: Sparkles,
      title: 'Welcome to the Structure Builder',
      body: [
        "This is where you design the full competition path for your season — qualifiers, events, and finals.",
        "Every card you add is a real tournament. You configure it inline here, set the advancement rules between tournaments, and publish everything in one shot.",
        "No separate tournament creation, no linking after the fact.",
      ],
    },
    {
      id: 'stats',
      anchorId: 'wizard-stats',
      placement: 'bottom',
      area: 'Stats overview',
      areaColor: 'text-zinc-300',
      icon: BarChart3,
      title: 'Quick stats at a glance',
      body: [
        "Tournaments — the total number of tournaments planned for this season.",
        "Configured — how many of them have the required setup details (format, team size, max teams, registration).",
        "Both update live as you edit.",
      ],
    },
    {
      id: 'quick-add',
      anchorId: 'quick-add',
      placement: 'bottom',
      area: 'Quick-add bar',
      areaColor: 'text-amber-400',
      icon: Flag,
      title: 'Add tournaments fast',
      body: [
        "Each button adds a real tournament with a specific role:",
        "• Qualifier — open-entry tournament for new teams.",
        "• Event — regional or circuit tournament.",
        "• Finals — terminal championship tournament.",
        "New tournaments start unnamed and unconfigured; the Inspector's name field auto-focuses so you can start typing.",
      ],
    },
    {
      id: 'templates',
      anchorId: 'templates-link',
      placement: 'bottom',
      area: 'Templates',
      areaColor: 'text-violet-400',
      icon: ListChecks,
      title: 'Start from a template',
      body: [
        "Click Templates to bring back the chooser at any time.",
        "Two presets are available: Regional Circuit (multi-region pathway) and Event Series (flat event stops).",
        "Templates replace your current tournaments — use them on a fresh season or when you want a clean restart.",
      ],
    },
    {
      id: 'canvas',
      anchorId: 'canvas',
      placement: 'right',
      area: 'Flow canvas',
      areaColor: 'text-zinc-300',
      icon: Layers3,
      title: 'Your tournaments, grouped by role',
      body: [
        "Cards appear in columns grouped by role — Qualifier, Event, Finals, Custom.",
        "Each card shows the tournament name, status, region, and whether its setup is Ready or still needs details.",
        "Click a card to load its full configuration into the Inspector on the right.",
      ],
    },
    {
      id: 'card',
      anchorId: 'canvas-card',
      onEnter: onRequireStageSelected,
      placement: 'right',
      area: 'Tournament card',
      areaColor: 'text-rose-400',
      icon: Workflow,
      title: 'Selecting a tournament',
      body: [
        "Selected cards are outlined and show a subtle ring.",
        "The Inspector on the right always reflects the selected tournament.",
        "If no card is selected, the Inspector shows an empty state.",
      ],
    },
    {
      id: 'inspector-name',
      anchorId: 'inspector-name',
      onEnter: onRequireStageSelected,
      placement: 'left',
      area: 'Inspector → Name',
      areaColor: 'text-white',
      icon: Sparkles,
      title: 'Name the tournament clearly',
      body: [
        "Players see this name in the season overview and in the tournament detail page.",
        "Good examples: 'South Asia Qualifier', 'Americas Group Stage', 'Grand Finals'.",
        "Names can be edited any time — the field auto-focuses on newly-added tournaments.",
      ],
    },
    {
      id: 'inspector-tournament',
      anchorId: 'inspector-tournament',
      onEnter: onRequireStageSelected,
      placement: 'left',
      area: 'Inspector → Tournament setup',
      areaColor: 'text-emerald-400',
      icon: Settings2,
      title: 'Configure the tournament inline',
      body: [
        "Set format, team size, max teams, and registration type right here — no jumping to a separate tournament creation flow.",
        "The header badge switches to 'Configured' once the required fields are filled.",
        "Entry fee, prize pool, best-of, and scheduling are optional but recommended for publishable tournaments.",
      ],
    },
    {
      id: 'inspector-advancement',
      anchorId: 'inspector-advancement',
      onEnter: onRequireStageSelected,
      placement: 'left',
      area: 'Inspector → Advancement',
      areaColor: 'text-cyan-400',
      icon: ArrowRightCircle,
      title: 'Wire advancement to the next tournament',
      body: [
        "Click 'Add target' to define where teams go after this tournament ends.",
        "Choose a rule: Top N, Top percentage, Points threshold, or Manual selection.",
        "Pick the seed mode to control how advancing teams are placed in the next bracket.",
        "Finals are terminal — no advancement target is needed.",
      ],
    },
    {
      id: 'inspector-schedule',
      anchorId: 'inspector-schedule',
      onEnter: onRequireStageSelected,
      placement: 'left',
      area: 'Inspector → Schedule',
      areaColor: 'text-violet-400',
      icon: CalendarRange,
      title: 'Independent dates per stage',
      body: [
        "• Registration — when sign-ups close for this stage.",
        "• Starts — when the stage begins.",
        "• Ends — when the stage concludes.",
        "Stages can run sequentially or in parallel (overlapping dates are allowed).",
      ],
    },
    {
      id: 'inspector-location',
      anchorId: 'inspector-location',
      onEnter: onRequireStageSelected,
      placement: 'left',
      area: 'Inspector → Location',
      areaColor: 'text-emerald-400',
      icon: MapPin,
      title: 'Location is per-stage',
      body: "Each stage carries its own Region, City, and Country. Useful for multi-territory seasons (e.g., a SEA qualifier in Bangkok feeding a Global Finals in Dubai).",
    },
    {
      id: 'inspector-status',
      anchorId: 'inspector-status',
      onEnter: onRequireStageSelected,
      placement: 'left',
      area: 'Inspector → Status',
      areaColor: 'text-amber-400',
      icon: Trophy,
      title: 'Status is manual',
      body: [
        "Lifecycle: Draft → Scheduled → Live → Completed → Archived.",
        "The platform never auto-transitions — you flip the status as your season progresses.",
        "Use Draft while building; Scheduled once you're ready to show it publicly.",
      ],
    },
    {
      id: 'advancement-overview',
      anchorId: null,
      area: 'Advancement overview',
      areaColor: 'text-rose-400',
      icon: BookOpen,
      title: 'How the pieces fit together',
      body: [
        "The flow is: configure tournaments inline, wire advancement between them, publish the whole season.",
        "On publish, every tournament is created with its advancement rules already in place.",
        "Season-wide points rules (the Points rules tab on the management page) are a separate, parallel layer that awards points across the season for season leaderboards.",
      ],
    },
    {
      id: 'outro',
      anchorId: null,
      area: surface === 'wizard' ? 'Continue when ready' : 'Save when ready',
      areaColor: 'text-rose-400',
      icon: CheckCircle2,
      title: "You're ready to build",
      body: outroCopy,
    },
  ];
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const SeasonBuilderTour = ({ open, surface, onClose, onRequireStageSelected }: SeasonBuilderTourProps) => {
  const steps = useMemo(
    () => buildSteps(surface, onRequireStageSelected),
    [surface, onRequireStageSelected],
  );

  return (
    <SpotlightTour
      open={open}
      steps={steps}
      flagName="season_builder"
      onClose={onClose}
      accent="rose"
      finalCta={surface === 'wizard' ? 'Continue building' : 'Got it'}
    />
  );
};

// Module-level icon for consumer convenience (e.g. Tour toolbar button)
SeasonBuilderTour.LaunchIcon = PlayCircle;

export default SeasonBuilderTour;
