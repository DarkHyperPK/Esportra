import { Layers, Users, CalendarClock, Eye, LayoutDashboard, Trophy } from 'lucide-react';
import JourneyTour, { type JourneySlide } from '@/components/onboarding/JourneyTour';

interface OrganizerJourneyTourProps {
  onComplete: () => void;
}

const slides: JourneySlide[] = [
  {
    icon: Layers,
    title: 'Build the Structure First',
    subtitle: 'Define your stages before anything else.',
    bullets: [
      'Create one stage for a simple cup — or chain multiple: Group Stage into Playoffs, Swiss into Knockout',
      'Each stage gets its own bracket format: single elimination, double elimination, Swiss, or Battle Royale',
      'Set team capacity and advancement count per stage — you control how many teams move forward',
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.06) 0%, transparent 60%)',
  },
  {
    icon: Users,
    title: 'Generate, Then Place Your Teams',
    subtitle: 'Create the bracket, then seed your participants.',
    bullets: [
      'Generate bracket builds the empty structure with TBD slots sized to your team count',
      'Seed teams places registered participants into those slots — odd numbers fill byes automatically',
      'You can re-seed before publishing if the roster changes — nothing is locked until you hit Publish',
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.07) 0%, transparent 60%)',
  },
  {
    icon: CalendarClock,
    title: 'Every Match Needs a Start Time',
    subtitle: 'Schedule each round before you publish.',
    bullets: [
      'After seeding, go to the Schedule tab to assign start times by round or match by match',
      'Players receive check-in reminders based on the times you set — no times means no reminders',
      'You can schedule all rounds upfront or set them between rounds as the cup runs',
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 60%)',
  },
  {
    icon: Eye,
    title: "Publish When You're Ready",
    subtitle: 'One button makes it live for everyone.',
    bullets: [
      'Publishing makes the bracket and match schedule visible to players and spectators',
      'Before you can publish: all teams must be seeded and first-round matches must have times set',
      'Once published, players receive their match schedule and check-in window automatically',
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.09) 0%, transparent 60%)',
  },
  {
    icon: LayoutDashboard,
    title: "You're Running It Now",
    subtitle: 'Monitor, resolve, and keep it moving.',
    bullets: [
      'The Needs You panel surfaces disputes, payment approvals, and scheduling gaps in one view',
      "Teams report results with screenshots — you only step in when there's a dispute",
      "If two captains can't agree on a match time after two hours, it escalates to you with the full conversation",
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.10) 0%, transparent 60%)',
  },
  {
    icon: Trophy,
    title: 'Your Cup Runs Like a Final',
    subtitle: 'Every match official. Every result recorded.',
    bullets: [
      'Every match is scheduled, check-in is automated, and results go on the record',
      'If anything needs attention, it appears in Needs You — disputes, payments, schedule gaps',
      'Find this guide again at any time in the Help menu at the top of your dashboard',
    ],
    gradient: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.12) 0%, transparent 60%)',
  },
];

export default function OrganizerJourneyTour({ onComplete }: OrganizerJourneyTourProps) {
  return (
    <JourneyTour
      slides={slides}
      accent="cyan"
      finalCta="Run my cup"
      onComplete={onComplete}
    />
  );
}
