import type { ReactNode } from 'react';
import {
  BookOpen, Trophy, Users, Network, Swords,
  Gavel, Settings, BarChart3, Shield,
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
export const organizerGuideSections: GuideSection[] = [
  {
    id: 'getting-started',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Getting Started',
    description: 'Get verified, set up your organization, and bring on staff.',
    steps: [
      {
        title: 'Create your Esportra account',
        content: 'Sign up using your email or social login, then complete your profile with a display name, avatar, and bio. A complete profile builds trust with potential participants.',
        navigation: 'Home → Sign Up → Complete Profile',
      },
      {
        title: 'Apply for an Organizer License',
        content: 'Head to the Verification Portal and apply under the Organizer section. Fill in your organization details, experience level, planned tournament types, and links to events you\'ve run before.',
        navigation: 'Verification Portal (/verification) → Apply for License → Submit',
        tip: 'Applications are typically reviewed within 1–3 business days. You\'ll receive an email notification once a decision is made.',
      },
      {
        title: 'Set up your organization',
        content: 'Once your license is approved, the organization setup wizard walks you through naming your organization and completing your public organizer profile. After that, everything is managed from the organizer dashboard.',
        navigation: 'Organizer Dashboard (/organizer/dashboard) → Setup Wizard (/organizer/setup-organization)',
      },
      {
        title: 'Invite your staff by email',
        content: 'Staff join through email invitations managed at the organization level — not per tournament. Each invitee is assigned a scoped permission role, so you decide exactly what they can access before they accept.',
        navigation: 'Organizer Dashboard (/organizer/dashboard) → Organization Tab → Staff Manager → Send Email Invitation',
        tip: 'Each tournament\'s own Staff tab simply redirects to the organization staff manager — permissions always live at the organization level.',
      },
    ],
  },
  {
    id: 'creating-tournament',
    icon: <Trophy className="w-5 h-5" />,
    title: 'Creating a Tournament',
    description: 'The seven-step wizard, from basic info to launch.',
    steps: [
      {
        title: 'Start the Tournament Wizard',
        content: 'Click "Create Tournament" and the wizard walks you through 7 fixed steps in order: 1 Basic Info → 2 Format & Rules → 3 Branding → 4 Prizes → 5 Registration → 6 Settings → 7 Review. Your draft autosaves locally as you go, and you can launch it privately as a draft or push it public whenever you\'re ready.',
        navigation: 'Organizer Dashboard (/organizer/dashboard) → Create Tournament',
      },
      {
        title: 'Step 1: Basic Info',
        content: 'Set the tournament name, game, description, and schedule. This is what players see first in listings, so make the description clear about format and expectations.',
        navigation: 'Create Tournament → Step 1: Basic Info',
        warning: 'The game mode is locked once the tournament is created — double-check it before continuing. Most other settings can still be edited later.',
      },
      {
        title: 'Step 2: Format & Rules',
        content: 'Choose a bracket type per stage — single_elimination, double_elimination, swiss, or round_robin — with a separate battle-royale tournament type available. Set best-of (BO1/BO3/BO5) per stage or per round with round-level overrides, define how many teams advance from each stage, and cap participation anywhere from 4 to 1024 teams.',
        navigation: 'Create Tournament → Step 2: Format & Rules',
      },
      {
        title: 'Configure the map pool',
        content: 'Map pools must match the exact required size for your game: CS2 and Valorant need exactly 7 maps, Rainbow Six Siege 9, and Call of Duty 10. Use the free-text rules field for anything else players must follow.',
        warning: 'A map pool that doesn\'t match the exact size required for the game can\'t be saved — add or remove maps until the count matches.',
      },
      {
        title: 'Steps 3–4: Branding & Prizes',
        content: 'Add your banner and branding in step 3, then configure prizes in step 4: prize pool, currency, and the distribution table. If you charge an entry fee, include entry-fee payment instructions — these are shown directly to players during registration. Payouts are handled manually by you outside the platform.',
        navigation: 'Create Tournament → Step 3: Branding → Step 4: Prizes',
        tip: 'Keep payment instructions concrete: exact method, reference format, and deadline. Clear instructions mean fewer receipts you have to chase.',
      },
      {
        title: 'Step 5: Registration',
        content: 'Set registration open/close dates, toggle whether check-in is required, and configure the check-in window — 30 minutes before start by default. Auto-removal of unchecked teams is on by default, a waitlist can absorb overflow, and invited-team codes reserve slots for specific teams with configurable expiry days.',
        navigation: 'Create Tournament → Step 5: Registration',
      },
      {
        title: 'Step 6: Settings',
        content: 'Two key toggles live here: assisted match reporting, which automatically pulls results for supported games, and map veto, which lets captains ban and pick maps before each match. Both can stay off for simpler events.',
        navigation: 'Create Tournament → Step 6: Settings',
      },
      {
        title: 'Step 7: Review & Launch',
        content: 'Check the full summary, then launch the tournament as a private draft or publish it publicly. Published events appear in listings immediately and begin accepting registrations.',
        navigation: 'Create Tournament → Step 7: Review → Launch',
      },
    ],
  },
  {
    id: 'managing-registrations',
    icon: <Users className="w-5 h-5" />,
    title: 'Managing Registrations',
    description: 'Approvals, payments, invites, and check-in enforcement.',
    steps: [
      {
        title: 'Open the manage page',
        content: 'Every tournament has one manage page with tabs for overview, participants, stages, brackets, prizes, schedule, bans, disputes, announcements, and settings. Everything below happens from here — the staff entry point just redirects to your organization\'s staff manager.',
        navigation: 'My Tournaments (/organizer/tournaments) → Select Tournament → Manage (/organizer/tournament/:slug)',
      },
      {
        title: 'Read participant badges',
        content: 'Participants carry status badges throughout the event: Pending Approval · Awaiting Check-in · Checked In · Missed · Approved · Rejected. Filtering by badge makes it easy to spot teams waiting on you.',
      },
      {
        title: 'Review payment receipts',
        content: 'For entry-fee events, players submit payment receipts during registration and each receipt waits for your review. Approve valid ones to confirm slots, or reject with a reason so the team knows what to fix and can resubmit.',
      },
      {
        title: 'Manage invite emails',
        content: 'Invited-team invitations are emails you fully control: draft them, send them, resend to non-responders, or revoke them entirely. Every invite reserves a slot for that team until its expiry days run out.',
        tip: 'Resend rather than re-invite — revoking an email frees the reserved slot for someone else immediately.',
      },
      {
        title: 'Enforce check-ins',
        content: 'When the check-in window closes, unchecked teams are flagged as Missed. The check-in enforcement card in the Settings tab tracks the window and includes a manual "Remove Unchecked Teams" button if you\'d rather act immediately than wait for automation.',
        navigation: 'Manage Page (/organizer/tournament/:slug) → Settings Tab → Check-In Enforcement',
      },
      {
        title: 'Seed the bracket',
        content: 'Seeding defaults to random order, so first-round pairings aren\'t influenced by who registered earliest. If you prefer skill-based placement, reorder participants manually before generating the bracket.',
        navigation: 'Manage Page → Participants Tab → Adjust Seeding',
      },
    ],
  },
  {
    id: 'brackets-stages',
    icon: <Network className="w-5 h-5" />,
    title: 'Brackets & Stages',
    description: 'Generate, unlock, and publish brackets stage by stage.',
    steps: [
      {
        title: 'Generate from the Stages tab',
        content: 'Brackets are generated per stage — never for the whole tournament at once. From the Stages tab, use "Generate Bracket" for elimination stages, "Generate Round 1" for swiss, or "Generate Groups" for round robin.',
        navigation: 'Manage Page → Stages Tab → Generate',
      },
      {
        title: 'Stages unlock sequentially',
        content: 'Generation unlocks in order: a stage can\'t be generated until the previous stage has completed. When many teams would receive BYEs, a high-BYE-count warning appears so you can sanity-check the draw before continuing.',
      },
      {
        title: 'Publish the bracket',
        content: 'Generating a bracket doesn\'t make it visible on its own. Once the pairings look right, click Publish Bracket to reveal it to participants and spectators.',
        navigation: 'Manage Page → Stages Tab → Publish Bracket',
      },
      {
        title: 'Run Swiss rounds',
        content: 'In swiss, "Generate Round N" unlocks as soon as the current round completes. Use the Auto Advance Byes bulk action to progress bye matches between rounds, and Undo Round if a round needs rolling back.',
        tip: 'BYEs can also be advanced individually from match cards when you only want to progress specific matches.',
      },
    ],
  },
  {
    id: 'running-matches',
    icon: <Swords className="w-5 h-5" />,
    title: 'Running Matches',
    description: 'Go live per match, collect verified scores, keep the schedule moving.',
    steps: [
      {
        title: 'Go Live on individual matches',
        content: 'Matches go live one at a time: click "Go Live" on the match card and confirm in the Start Match dialog, which requires the party code. Force-start is available if a round needs pushing along early.',
        navigation: 'Brackets Tab → Match Card → Go Live → Start Match (Party Code)',
        warning: 'There is deliberately no batch "Start All" control — have the party code ready before going live, because the dialog won\'t proceed without it.',
      },
      {
        title: 'Run the map veto',
        content: 'With map veto enabled in settings, captains alternate banning and picking maps in realtime, with each action visible to both sides instantly. The match plays out on whatever maps survive the veto.',
      },
      {
        title: 'Collect scores',
        content: 'Either captain may submit the result — from the match room or directly on the bracket cards. Equal scores are rejected automatically, and the opposing captain must verify before the match advances.',
        navigation: 'Match Room → Report Score, or Brackets Tab → Match Card → Report',
      },
      {
        title: 'Use assisted reporting',
        content: 'When assisted match reporting is enabled, results for Valorant and League of Legends matches are pulled automatically — captains may have nothing to submit. Spot-check pulled results so a bad report doesn\'t silently advance a match.',
      },
      {
        title: 'Keep the schedule tight',
        content: 'The Schedule tab handles per-match and bulk scheduling, a self-play toggle, and match-level deadlines. Each match carries its own check-in window — around 15 minutes before start by default — tunable per match.',
        navigation: 'Manage Page → Schedule Tab',
      },
      {
        title: 'Handle missed match check-ins',
        content: 'Teams that miss their match-level check-in don\'t need manual intervention: an automatic walkover goes to the opponent. Individual outcomes can still be corrected afterwards via the Manual Adjustment menu.',
      },
    ],
  },
  {
    id: 'disputes',
    icon: <Gavel className="w-5 h-5" />,
    title: 'Disputes',
    description: 'Resolve score disagreements from the dedicated workspace.',
    steps: [
      {
        title: 'Open the disputes workspace',
        content: 'Disputes land in a dedicated workspace reachable at /organizer/disputes or through any tournament\'s Disputes tab. Staff can be assigned to disputes, so rulings don\'t have to bottleneck on you alone.',
        navigation: 'Dispute Center (/organizer/disputes), or Manage Page → Disputes Tab',
      },
      {
        title: 'Compare both sides',
        content: 'Each dispute lays out the two contested scores side by side, with an evidence column for each team. Review the screenshots and statements from both sides before making a call.',
      },
      {
        title: 'Resolve or reject',
        content: 'Resolve locks in the final score you enter and advances the match. Reject clears the disputed reports instead, returning the match so the correct score can be entered normally from the brackets view.',
        warning: 'Document your reasoning when resolving — your decision is final for the tournament, and a clear record helps if it\'s ever questioned.',
      },
    ],
  },
  {
    id: 'advanced-bracket-management',
    icon: <Settings className="w-5 h-5" />,
    title: 'Advanced Bracket Management',
    description: 'Manual adjustments, bans, announcements, and double elimination.',
    steps: [
      {
        title: 'Manual Adjustment menu',
        content: 'Every match card has a ⋮ menu with manual adjustment actions: Walkover (award the win to either team), Swap Teams, and Reset Match. Resets are only available for completed matches and can cascade — later matches built on the reverted result go back with it.',
        navigation: 'Brackets Tab → Match Card → ⋮ Menu',
        warning: 'Resetting a match in a later round can cascade through everything that depended on it. Verify what\'s downstream before resetting.',
      },
      {
        title: 'Ban players or teams',
        content: 'The Bans tab manages player and team bans for the tournament and keeps a history of every ban issued. Banned entries can\'t take part while the ban stands.',
        navigation: 'Manage Page → Bans Tab',
      },
      {
        title: 'Broadcast announcements',
        content: 'The Announcements tab broadcasts updates to everyone in the tournament — schedule changes, round starts, reminders. Treat it as the official channel rather than messaging teams one by one.',
        navigation: 'Manage Page → Announcements Tab',
      },
      {
        title: 'Double Elimination specifics',
        content: 'In double elimination, a loss sends a team to the losers bracket and a second loss eliminates them. The grand final pits the winners bracket champion against the losers bracket champion, with a bracket reset if the losers bracket side wins the first series.',
        navigation: 'Manage Page → Brackets Tab → Winners / Losers View',
      },
    ],
  },
  {
    id: 'post-tournament',
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'After the Tournament',
    description: 'Analytics, history, and fixing last-minute mistakes.',
    steps: [
      {
        title: 'Finalize results',
        content: 'When the final match concludes, the tournament is marked complete automatically and the winner is displayed on the tournament page and bracket. Results are permanently recorded.',
        navigation: 'Tournament Page → Results (auto-populated after the final)',
      },
      {
        title: 'Review analytics',
        content: 'Tournament analytics cover participation, prize pools, game mix across your events, and event momentum over time. Use them to see which formats and games resonate before planning the next season.',
        navigation: 'Organizer Dashboard (/organizer/dashboard) → Analytics',
      },
      {
        title: 'Track past events',
        content: 'The History tab lists your past tournaments so you can revisit formats, dates, and outcomes when planning follow-ups.',
        navigation: 'Organizer Dashboard (/organizer/dashboard) → History Tab',
      },
      {
        title: 'Restore deleted tournaments',
        content: 'Deleted tournaments are soft-deleted and restorable for 7 days from your tournaments list. Restoring brings back the event with its participants and settings intact.',
        navigation: 'My Tournaments (/organizer/tournaments) → Restore Deleted',
        warning: 'After 7 days a soft-deleted tournament is gone for good — restore promptly if the deletion was a mistake.',
      },
    ],
  },
  {
    id: 'best-practices',
    icon: <Shield className="w-5 h-5" />,
    title: 'Best Practices',
    description: 'Tips from experienced organizers for smooth events.',
    steps: [
      {
        title: 'Communicate early and often',
        content: 'Publish clear rules, schedules, and formats before registration opens, then keep teams posted during the event through the Announcements tab. There\'s no automatic check-in reminder notification, so broadcast your own reminders ahead of every window.',
        navigation: 'Manage Page → Announcements Tab',
      },
      {
        title: 'Start with smaller events',
        content: 'Run your first few tournaments with 8–16 teams in Single Elimination to learn the platform without juggling a complex multi-stage bracket. Scale up to swiss or double elimination as confidence grows.',
      },
      {
        title: 'Plan for no-shows',
        content: 'Expect 10–20% of registrants to miss check-in. Enable the waitlist during setup, lean on automatic removal of unchecked teams, and keep a buffer between rounds for rescheduling.',
        tip: 'Invited-team codes beat hoping key teams register in time — reserved slots with expiry days secure your headline participants.',
      },
      {
        title: 'Delegate to staff',
        content: 'Scoped permission roles let you hand disputes, scheduling, or announcements to trusted staff without giving away full control. Assign staff to disputes so rulings don\'t wait on one person.',
        navigation: 'Organizer Dashboard (/organizer/dashboard) → Organization Tab → Staff Manager',
      },
      {
        title: 'Be fair and consistent',
        content: 'Apply rules equally to all participants, document dispute rulings, and avoid changing rules mid-tournament unless absolutely necessary. Consistency builds the reputation that brings teams back.',
      },
    ],
  },
];
