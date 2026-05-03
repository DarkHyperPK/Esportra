import { Shield, UserPlus, Gamepad2, Trophy, Radio, Swords, Crown } from 'lucide-react';
import JourneyTour, { type JourneySlide } from '@/components/onboarding/JourneyTour';

interface CaptainJourneyTourProps {
  onComplete: () => void;
}

const slides: JourneySlide[] = [
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

export default function CaptainJourneyTour({ onComplete }: CaptainJourneyTourProps) {
  return (
    <JourneyTour
      slides={slides}
      accent="rose"
      finalCta="I'm Ready, Let's Go!"
      onComplete={onComplete}
    />
  );
}
