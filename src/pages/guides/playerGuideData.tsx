import type { ReactNode } from 'react';
import {
  UserPlus, Trophy, CalendarCheck, Swords, ClipboardCheck,
  ShieldAlert, BellRing, PartyPopper, Building2, Lightbulb,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────── */
export interface GuideStep {
  title: string;
  content: string;
  navigation?: string;
  tip?: string;
  warning?: string;
}

export interface GuideSection {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  steps: GuideStep[];
}

/* ─── Guide Data ─────────────────────────────────────────────── */
export const playerGuideSections: GuideSection[] = [
  {
    id: 'getting-started',
    icon: <UserPlus className="w-5 h-5" />,
    title: 'Getting Started',
    description: 'Create your account, find a team, and get ready to compete.',
    steps: [
      {
        title: 'Create your Esportra account',
        content: 'Sign up with your email or social login, then complete your profile with a display name and avatar. Your profile is how organizers and opponents identify you across every tournament you play.',
        navigation: 'Home → Sign Up → Complete Profile',
      },
      {
        title: 'Join or create a team',
        content: 'Most Esportra tournaments are played as a team, so head to the Team Hub to either create your own squad or join an existing one. If you create a team, you become its captain — captains handle the roster, invite players, and represent the team during matches.',
        navigation: 'Team Hub (/player/teams) → Create Team or Join a Team',
        tip: 'Only captains can submit scores, respond to vetoes, and verify results — choose yours wisely.',
      },
      {
        title: 'Watch your notification inbox',
        content: 'Team invitations arrive as notifications, not emails. Open your notification center and use the filter chips — All, Unread, Invites, and System — to quickly surface pending invites so you never miss a roster spot.',
        navigation: 'Notifications (/notifications) → Invites filter chip → Accept',
      },
      {
        title: 'Redeem invite codes',
        content: 'Organizers and captains can share invite codes for tournaments and teams. Paste a code into the redeem prompt dialog to claim your spot — you can copy codes to share them with teammates or redeem one yourself in a couple of clicks.',
        navigation: 'Open Prompt Dialog → Paste Invite Code → Copy / Redeem',
      },
    ],
  },
  {
    id: 'finding-tournaments',
    icon: <Trophy className="w-5 h-5" />,
    title: 'Finding & Entering Tournaments',
    description: 'Browse events, register solo or with your team, and secure your slot.',
    steps: [
      {
        title: 'Browse tournament listings',
        content: 'Scroll the public listings to find events for your game, format, and skill level. Click any card to open the full tournament page where you\'ll find the rules, schedule, prize details, and registered teams.',
        navigation: 'Tournaments (/tournaments) → Open Event (/tournaments/:slug)',
      },
      {
        title: 'Register solo or as a team',
        content: 'Depending on how the organizer configured the event, registration is either solo (you enter alone and get placed) or team-based (your captain signs up the whole roster). Check the registration type on the tournament page before the deadline.',
        navigation: 'Tournament Page (/tournaments/:slug) → Register',
        warning: 'Registration closes before the tournament starts — don\'t leave signing up until the last minute.',
      },
      {
        title: 'Pay entry fees (paid events)',
        content: 'If the tournament has an entry fee, the organizer\'s PAYMENT INSTRUCTIONS appear during registration. Follow them exactly, then submit your payment receipt through the platform. The organizer reviews and approves each receipt manually — your slot is confirmed once approved.',
        navigation: 'Tournament Page → Register → PAYMENT INSTRUCTIONS → Upload Receipt',
        warning: 'Your registration isn\'t confirmed until the organizer approves your payment receipt.',
      },
      {
        title: 'Understand waitlists',
        content: 'Full tournament? You\'ll join the waitlist instead of being turned away. If a registered team withdraws or fails payment, waitlisted entries are promoted in order — keep an eye on your notifications around the registration deadline.',
        tip: 'Waitlisted slots free up most often right after payment deadlines pass.',
      },
      {
        title: 'Use invited-team codes for reserved slots',
        content: 'Some events are invite-only or reserve slots for specific teams. An invited-team code doesn\'t just grant access — it reserves your slot, bypassing the general rush for places. Redeem it promptly once received.',
        navigation: 'Prompt Dialog → Paste Team Code → Redeem Reserved Slot',
      },
    ],
  },
  {
    id: 'check-in',
    icon: <CalendarCheck className="w-5 h-5" />,
    title: 'Checking In',
    description: 'Two check-ins decide whether you play — miss either and you\'re out.',
    steps: [
      {
        title: 'Tournament check-in',
        content: 'Before the tournament begins, a check-in window opens — 30 minutes before start by default, though organizers can configure it differently. Your captain must check the team in during this window. Only checked-in teams are placed into the bracket.',
        navigation: 'Tournament Page (/tournaments/:slug) → Check In button (when window is open)',
        warning: 'Miss the tournament check-in window and your team is auto-removed — you won\'t enter the bracket at all.',
      },
      {
        title: 'Match check-in',
        content: 'There\'s a second, per-match check-in that opens shortly before each of your matches — 15 minutes before by default. Confirm your team is present for every round, not just the first one.',
        navigation: 'Match Room → Match Check In',
        warning: 'Missing match check-in can hand your opponent an automatic walkover — the win is theirs without a game being played.',
      },
      {
        title: 'Build a pre-game routine',
        content: 'Have your captain online ahead of both windows, with the whole roster reachable. Check-ins are the single most common reason good teams lose tournaments without playing a single map.',
        tip: 'Set alarms for the tournament start time and each scheduled round — check-in windows won\'t wait for you.',
      },
    ],
  },
  {
    id: 'match-day',
    icon: <Swords className="w-5 h-5" />,
    title: 'Match Day',
    description: 'Brackets, match rooms, time proposals, and live map veto.',
    steps: [
      {
        title: 'Follow the bracket live',
        content: 'The bracket page is public — share it with teammates and spectators. Anyone can watch results roll in round by round, and there\'s a fullscreen mode for streaming or showing the bracket on a venue screen.',
        navigation: 'Bracket Page (/tournaments/:slug/brackets) → Fullscreen Mode',
      },
      {
        title: 'Enter the match room',
        content: 'When the organizer hits Go Live on your match, your match room opens and both teams are notified. Everything happens from here: check-in, scheduling, veto, score reporting, and chat.',
        navigation: 'Notification → Open Match Room',
      },
      {
        title: 'Propose or accept match times',
        content: 'Can\'t play right away? Either captain proposes match times and the other accepts. Time proposals sync in realtime, so both sides always see the latest offer — agree on a time and the match is set.',
        navigation: 'Match Room → Time Proposals → Propose / Accept',
      },
      {
        title: 'Run the map veto',
        content: 'For veto-enabled games (CS2, Valorant, Rainbow Six Siege, Call of Duty), captains alternate banning and picking maps from the tournament\'s configured map pool. The veto runs in realtime — you\'ll see the opponent\'s ban or pick the moment they make it.',
        navigation: 'Match Room → Map Veto → Ban / Pick',
        tip: 'Discuss your team\'s veto order before the match — hesitating mid-veto wastes everyone\'s time.',
      },
      {
        title: 'Everything updates instantly',
        content: 'Esportra pushes updates over a live connection: vetoes, time proposals, check-ins, and score submissions all appear the instant they happen. No refreshing, no polling — just keep the match room open.',
      },
    ],
  },
  {
    id: 'score-reporting',
    icon: <ClipboardCheck className="w-5 h-5" />,
    title: 'Score Reporting',
    description: 'Submit, verify, and protect your results.',
    steps: [
      {
        title: 'Captain submits the result',
        content: 'After each map, one captain enters the final score in the match room. Submit honestly — every submission is visible to the opposing captain and the organizer.',
        navigation: 'Match Room → Report Score → Submit',
      },
      {
        title: 'The opposing captain verifies',
        content: 'A submitted score isn\'t final until the other captain verifies it. Once both sides agree, the match advances automatically. This two-captain system keeps results honest without waiting on the organizer for every match.',
        warning: 'Equal scores (like 1–1) are rejected automatically — someone has to win the map.',
      },
      {
        title: 'Assisted reporting',
        content: 'For Valorant and League of Legends matches, the platform may auto-report results when the organizer enables assisted reporting. If automatic reporting is active you may not need to submit anything — just confirm the reported score looks right.',
      },
      {
        title: 'Screenshot every scoreboard',
        content: 'Capture the final scoreboard of every map before leaving the game. If a disagreement ever turns into a dispute, screenshots are the fastest evidence you can provide.',
        navigation: 'Match Room → Dispute Evidence → Upload Screenshot',
        tip: 'Full-screen captures that show the map, timer, and both team names carry the most weight.',
      },
    ],
  },
  {
    id: 'disputes',
    icon: <ShieldAlert className="w-5 h-5" />,
    title: 'Disputes',
    description: 'What happens when captains disagree on a result.',
    steps: [
      {
        title: 'Rejecting a score creates a dispute',
        content: 'If your opponent submits a score you believe is wrong, reject it instead of verifying. This creates a formal dispute and pauses the match until it\'s resolved — never verify a result you know is incorrect just to save time.',
        navigation: 'Match Room → Submitted Score → Reject → Dispute Created',
      },
      {
        title: 'Both sides submit evidence',
        content: 'Once a dispute is open, both teams can upload their evidence — scoreboard screenshots, recordings, or written explanations. This is why you screenshot every map.',
        navigation: 'Match Room → Dispute Panel → Upload Evidence',
      },
      {
        title: 'The organizer rules',
        content: 'The tournament organizer reviews both submissions and issues a ruling. Their decision sets the final score and advances the match — treat organizer rulings as binding for the event.',
        tip: 'Stay professional in the dispute panel. Clear evidence wins arguments; hostility doesn\'t.',
      },
      {
        title: 'Escalating further',
        content: 'Organizer rulings are final for their tournament. Escalation to platform admins is reserved strictly for rule violations — not for disagreeing with a close judgment call.',
      },
    ],
  },
  {
    id: 'notifications-comms',
    icon: <BellRing className="w-5 h-5" />,
    title: 'Notifications & Communication',
    description: 'Stay reachable and keep every match coordinated.',
    steps: [
      {
        title: 'Know what reaches you',
        content: 'Esportra notifies you about schedule changes, walkovers awarded against or for you, team and tournament invites, check-in windows, and dispute outcomes. Check your notification center before every session.',
        navigation: 'Notifications (/notifications)',
      },
      {
        title: 'Use match chat',
        content: 'Every match room has chat built in — it\'s the official channel for coordinating with your opponents and the organizer. Agree on lobby details, sort out delays, and keep a record of anything important said between teams.',
        navigation: 'Match Room → Chat',
        tip: 'Keep important agreements in match chat rather than Discord DMs — organizers can see the official channel.',
      },
    ],
  },
  {
    id: 'after-the-tournament',
    icon: <PartyPopper className="w-5 h-5" />,
    title: 'After the Tournament',
    description: 'End screens, public results, and finding your next event.',
    steps: [
      {
        title: 'Read your end screen',
        content: 'How your run ends is shown clearly:\n\n• Champions — you won the grand final.\n• Runners-Up — you made the final but fell short.\n• Eliminated — shown together with the exact round you exited in.\n• Waiting for next round — a spinner while earlier matches finish.\n• Bracket in Preparation — the bracket is still being generated.',
      },
      {
        title: 'Results are permanent and public',
        content: 'Final placements are recorded on the tournament page and bracket for anyone to see. Your results build your team\'s track record on the platform — future opponents and organizers will see them.',
        navigation: 'Tournament Page (/tournaments/:slug) → Results',
      },
      {
        title: 'Find your next event',
        content: 'Right from the end screen, jump straight back into the listings. Momentum matters — the teams that improve fastest are the ones already registered for their next tournament before the adrenaline wears off.',
        navigation: 'Find More Tournaments (/tournaments)',
      },
    ],
  },
  {
    id: 'venue-booking',
    icon: <Building2 className="w-5 h-5" />,
    title: 'Bonus: Booking Gaming Venues',
    description: 'Esportra isn\'t just online — book local gaming venues for your team.',
    steps: [
      {
        title: 'Browse venues with amenity filters',
        content: 'Looking for a place to bootcamp or host a LAN night? Browse the venues directory and filter by amenities that matter to your team — WiFi, A/C, private rooms, backup power, and more.',
        navigation: 'Venues (/venues) → Filter by Amenities',
      },
      {
        title: 'Check live seat availability',
        content: 'Each venue listing shows live seat availability, so you know exactly how many stations are free before you commit. No calling ahead, no guessing.',
        navigation: 'Venues (/venues) → Select Venue → Live Seat Availability',
      },
      {
        title: 'Manage your bookings',
        content: 'After booking, everything lives in your profile\'s Bookings tab: your booking code for check-in at the venue, the stations assigned to you, and your booked hours.',
        navigation: 'Your Profile → Bookings Tab → Booking Code / Stations / Hours',
        tip: 'Screenshot or note your booking code before arriving — venues use it to find your reservation.',
      },
    ],
  },
  {
    id: 'best-practices',
    icon: <Lightbulb className="w-5 h-5" />,
    title: 'Player Best Practices',
    description: 'Habits that separate prepared teams from eliminated ones.',
    steps: [
      {
        title: 'Be online 15+ minutes early',
        content: 'Both check-in windows and match starts reward teams that are ready ahead of time. Have your captain logged in and the roster assembled well before any deadline.',
      },
      {
        title: 'Keep roster contact channels ready',
        content: 'Make sure every player can be reached quickly on tournament day — a group chat outside the platform plus notification checks covers the gaps. A teammate who can\'t be found is a forfeit waiting to happen.',
      },
      {
        title: 'Screenshot every map result',
        content: 'It costs two seconds and settles disputes in minutes. Final scoreboard, both team names, visible — every map, every match, no exceptions.',
      },
      {
        title: 'Respond fast during veto and time proposals',
        content: 'Vetoes and time proposals run in realtime while your opponent waits. Slow responses stall the whole bracket — agree on your team\'s map priorities in advance and answer proposal offers promptly.',
      },
      {
        title: 'Respect organizer rulings',
        content: 'Organizers volunteer their time to run the events you play in. Follow their instructions, accept their rulings, and raise genuine problems through disputes properly — reputation follows you between tournaments.',
      },
    ],
  },
];
