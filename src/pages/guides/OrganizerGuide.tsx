import React, { useState } from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  Trophy, Users, Settings, Shield, ChevronRight, ChevronDown,
  Calendar, MapPin, Swords, BarChart3, Bell, Clock, CheckCircle2,
  AlertTriangle, Info, ArrowRight, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ─── Types ──────────────────────────────────────────────────── */
interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: GuideStep[];
}

interface GuideStep {
  title: string;
  content: string;
  tip?: string;
  warning?: string;
  screenshotPlaceholder?: string;
}

/* ─── Guide Data ─────────────────────────────────────────────── */
const guideSections: GuideSection[] = [
  {
    id: 'getting-started',
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Getting Started',
    description: 'Set up your organizer account and get verified to start hosting.',
    steps: [
      {
        title: 'Create your Esportra account',
        content: 'Sign up at esportra.com using your email or social login. Complete your profile by adding a display name, avatar, and bio. A complete profile builds trust with potential participants.',
        screenshotPlaceholder: '[SCREENSHOT: Sign-up page with email form]',
      },
      {
        title: 'Apply for an Organizer License',
        content: 'Navigate to Settings → Verification and click "Apply for Organizer License". Fill in your organization details including your experience level, planned tournament types, and any relevant links to previous events you\'ve organized.',
        tip: 'Applications are typically reviewed within 1–3 business days. You\'ll receive an email notification when approved.',
        screenshotPlaceholder: '[SCREENSHOT: Verification settings page with "Apply" button]',
      },
      {
        title: 'Set up your Organizer Profile',
        content: 'Once approved, customize your organizer profile page. Add a banner image, description, social links, and your organization\'s branding. This is the public page players will see when they view your tournaments.',
        screenshotPlaceholder: '[SCREENSHOT: Organizer profile edit page]',
      },
      {
        title: 'Invite your staff (optional)',
        content: 'If you have moderators or admins who help run events, invite them as staff members. Go to your Organizer Dashboard → Staff and generate invite links. Staff can help manage matches, handle disputes, and moderate chat during tournaments.',
        tip: 'Assign specific permissions to each staff member based on their role. Not everyone needs full admin access.',
      },
    ],
  },
  {
    id: 'creating-tournament',
    icon: <Trophy className="w-5 h-5" />,
    title: 'Creating a Tournament',
    description: 'Step-by-step guide to setting up your first tournament.',
    steps: [
      {
        title: 'Start the Tournament Wizard',
        content: 'From your Organizer Dashboard, click "Create Tournament". The wizard walks you through each configuration step. You can save as draft at any point and come back later.',
        screenshotPlaceholder: '[SCREENSHOT: Organizer dashboard with "Create Tournament" button highlighted]',
      },
      {
        title: 'Basic Information',
        content: 'Set the tournament name, description, and select the game (e.g., CS2, Valorant). Add a banner image that represents your event — this appears in tournament listings and search results. Write a compelling description that covers the format, rules, and what players can expect.',
        tip: 'Use a 16:9 banner image for the best display across desktop and mobile.',
        screenshotPlaceholder: '[SCREENSHOT: Tournament creation form — basic info step]',
      },
      {
        title: 'Schedule & Registration',
        content: 'Set your registration open/close dates, tournament start date, and check-in window. Choose between solo or team registration. Set the maximum number of participants and any entry requirements.',
        warning: 'Make sure to set registration close before the tournament start time. Players need time to form teams and check in.',
        screenshotPlaceholder: '[SCREENSHOT: Schedule configuration step]',
      },
      {
        title: 'Choose Bracket Format',
        content: 'Select your bracket format:\n\n• Single Elimination — Each loss eliminates. Fast, decisive, best for smaller events.\n• Double Elimination — Players get a second chance through the losers bracket. More matches, fairer outcomes.\n• Swiss System — Round-based pairing by record. Great for large groups where full round-robin isn\'t feasible.\n• Round Robin — Everyone plays everyone. Best for small groups or league-style play.',
        tip: 'For your first tournament, Single Elimination with 8–16 players is the easiest to manage.',
        screenshotPlaceholder: '[SCREENSHOT: Bracket format selection cards]',
      },
      {
        title: 'Configure Match Settings',
        content: 'Set the best-of format for each stage (Bo1, Bo3, Bo5). Configure map pool and veto settings if applicable. Set the default time per match and any overtime rules. You can customize these per round later.',
        screenshotPlaceholder: '[SCREENSHOT: Match settings configuration]',
      },
      {
        title: 'Review & Publish',
        content: 'Review all settings on the summary page. Once published, the tournament appears in public listings and players can register. You can still edit most settings until registration closes, except the bracket format.',
        warning: 'The bracket format cannot be changed after the tournament is published. Double-check this before publishing.',
        screenshotPlaceholder: '[SCREENSHOT: Tournament review/summary page]',
      },
    ],
  },
  {
    id: 'managing-registrations',
    icon: <Users className="w-5 h-5" />,
    title: 'Managing Registrations',
    description: 'Handle player sign-ups, check-ins, and seeding.',
    steps: [
      {
        title: 'Monitor registrations',
        content: 'View all registered participants from the tournament\'s Manage page → Participants tab. You can see registration time, team details, and check-in status. The progress bar shows how close you are to capacity.',
        screenshotPlaceholder: '[SCREENSHOT: Participants list with registration count]',
      },
      {
        title: 'Handle the check-in window',
        content: 'The check-in window opens automatically at the configured time before the tournament starts. Players must check in during this window or risk being removed. You can manually check in or remove players from the admin view.',
        tip: 'Send a reminder in your tournament\'s communication channel 30 minutes before check-in opens.',
      },
      {
        title: 'Seed the bracket',
        content: 'After registration closes, review and adjust seeding if needed. By default, players are seeded by registration order, but you can manually reorder them based on skill rating, previous performance, or any criteria you prefer.',
        screenshotPlaceholder: '[SCREENSHOT: Seeding/reorder interface]',
      },
      {
        title: 'Handle no-shows',
        content: 'If players don\'t check in, they\'re flagged as no-shows. You can either remove them (reducing bracket size) or award walkovers to their opponents. The system handles bracket adjustments automatically.',
      },
    ],
  },
  {
    id: 'running-matches',
    icon: <Swords className="w-5 h-5" />,
    title: 'Running Matches',
    description: 'Start, manage, and resolve matches during the tournament.',
    steps: [
      {
        title: 'Generate the bracket',
        content: 'Once check-in closes, generate the bracket from the Manage Bracket page. The system creates all first-round matches based on seeding. Review the bracket before starting — you can swap participants if needed.',
        screenshotPlaceholder: '[SCREENSHOT: Generated bracket view with swap controls]',
      },
      {
        title: 'Start matches (Go Live)',
        content: 'Click "Go Live" on individual matches or use "Start All" to begin the round. Going live notifies both teams and opens the match lobby. Players can then proceed with map veto (if configured) and play their match.',
        screenshotPlaceholder: '[SCREENSHOT: Match card with "Go Live" button]',
      },
      {
        title: 'Map veto process',
        content: 'If map veto is enabled, teams alternate banning and picking maps from the pool. The veto process is real-time — both captains see updates instantly via SignalR. Once the veto completes, the match can begin on the selected map(s).',
        screenshotPlaceholder: '[SCREENSHOT: Map veto interface with ban/pick sequence]',
      },
      {
        title: 'Score reporting',
        content: 'After each map/game, the winning team\'s captain submits the score. The opposing captain must verify the score. If both agree, the match advances automatically. If there\'s a dispute, see the Disputes section below.',
        tip: 'Encourage teams to take screenshots of the scoreboard. This speeds up dispute resolution if needed.',
        screenshotPlaceholder: '[SCREENSHOT: Score submission form]',
      },
      {
        title: 'Advance BYE matches',
        content: 'If the bracket has an odd number of participants, some players receive BYEs (automatic advances). Use the "Advance BYE" button to progress these matches. The system marks them appropriately in the bracket.',
      },
      {
        title: 'Award walkovers',
        content: 'If a team fails to show up or forfeits, award a walkover to their opponent using the Manual Adjustment menu. This advances the winning team and records the match as a walkover in the bracket history.',
        screenshotPlaceholder: '[SCREENSHOT: Manual adjustment dropdown menu]',
      },
    ],
  },
  {
    id: 'disputes',
    icon: <AlertTriangle className="w-5 h-5" />,
    title: 'Handling Disputes',
    description: 'Resolve score disagreements and rule violations.',
    steps: [
      {
        title: 'When disputes arise',
        content: 'A dispute is created when one team rejects the opponent\'s submitted score. The match is flagged and both teams can submit evidence (screenshots, replay files). The match pauses until resolved.',
        screenshotPlaceholder: '[SCREENSHOT: Match with dispute indicator]',
      },
      {
        title: 'Review evidence',
        content: 'As the organizer, go to the dispute panel to see both teams\' submissions. Review any uploaded screenshots, match replays, or written explanations. Contact teams through the match chat if clarification is needed.',
      },
      {
        title: 'Make a ruling',
        content: 'Set the correct score and resolve the dispute. The match advances with your ruling. Both teams are notified. Your decision is final for the tournament, though teams can escalate to platform admins for rule violations.',
        warning: 'Document your reasoning when resolving disputes. This helps if the decision is reviewed later.',
      },
    ],
  },
  {
    id: 'bracket-management',
    icon: <Settings className="w-5 h-5" />,
    title: 'Advanced Bracket Management',
    description: 'Swiss rounds, resets, swaps, and manual adjustments.',
    steps: [
      {
        title: 'Swiss System — generating rounds',
        content: 'In Swiss format, rounds are generated one at a time. After all matches in a round complete, click "Generate Next Round". The system pairs teams with similar records (e.g., 2-0 plays 2-0). The number of rounds is calculated automatically based on participant count.',
        tip: 'For 16 participants, Swiss typically runs 4 rounds. For 32, it runs 5. The system calculates this automatically.',
        screenshotPlaceholder: '[SCREENSHOT: Swiss standings with "Generate Next Round" button]',
      },
      {
        title: 'Resetting matches',
        content: 'If a match result was entered incorrectly, you can reset it from the Manual Adjustment menu. This clears the scores and sets the match back to its previous state. Note: resetting a match may undo advancement in later rounds.',
        warning: 'Resetting matches in later rounds can cascade — subsequent matches that depended on this result may also need to be replayed.',
      },
      {
        title: 'Swapping participants',
        content: 'Before matches go live, you can swap participants between matches using the swap feature. This is useful for correcting seeding errors or accommodating scheduling conflicts.',
      },
      {
        title: 'Double Elimination specifics',
        content: 'In double elimination, losing a match sends a team to the losers bracket. Teams eliminated from the losers bracket are out. The grand final is between the winners bracket champion and losers bracket champion. If the losers bracket champion wins the first grand final, a reset match may be played.',
        screenshotPlaceholder: '[SCREENSHOT: Double elimination bracket showing winners and losers sides]',
      },
    ],
  },
  {
    id: 'post-tournament',
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'After the Tournament',
    description: 'Finalize results, view analytics, and plan your next event.',
    steps: [
      {
        title: 'Finalize the tournament',
        content: 'Once the final match concludes, the tournament is automatically marked as completed. The winner is displayed on the tournament page and bracket. All results are permanently recorded.',
        screenshotPlaceholder: '[SCREENSHOT: Completed tournament with winner displayed]',
      },
      {
        title: 'Review analytics',
        content: 'Check your tournament analytics for insights: total registrations, match completion rates, average match duration, viewer counts (if streamed), and participant feedback. Use these metrics to improve future events.',
        screenshotPlaceholder: '[SCREENSHOT: Tournament analytics dashboard]',
      },
      {
        title: 'Grow your community',
        content: 'Share tournament results on social media. Use your organizer profile to build a following. Consistent, well-run events attract repeat participants and sponsors. Consider running regular weekly or monthly events to build momentum.',
        tip: 'Players are more likely to return to tournaments with clear communication, fair rulings, and timely start times.',
      },
    ],
  },
  {
    id: 'best-practices',
    icon: <Shield className="w-5 h-5" />,
    title: 'Best Practices',
    description: 'Tips from experienced organizers to run smooth events.',
    steps: [
      {
        title: 'Communication is key',
        content: 'Set expectations early: publish clear rules, schedule, and format before registration opens. Send reminders before check-in. Use the match chat to stay in contact with teams during the event. Respond to questions quickly.',
      },
      {
        title: 'Start with smaller events',
        content: 'Run your first few tournaments with 8–16 participants in Single Elimination format. This lets you learn the platform tools without the pressure of managing a large, complex bracket. Scale up as you gain confidence.',
      },
      {
        title: 'Have backup plans',
        content: 'Expect no-shows (typically 10–20% of registrants). Over-register slightly or have a waitlist ready. Have a staff member available to handle disputes while you manage the bracket. Plan for technical issues with a 15-minute buffer between rounds.',
      },
      {
        title: 'Be fair and consistent',
        content: 'Apply rules equally to all participants. Document dispute rulings. Don\'t change rules mid-tournament unless absolutely necessary. Consistency builds your reputation and brings players back for future events.',
      },
      {
        title: 'Timing matters',
        content: 'Schedule tournaments when your target audience is available (typically evenings and weekends). Allow enough time between matches for breaks. Don\'t rush — a smooth, well-paced tournament is better than a fast but chaotic one.',
        tip: 'The most popular tournament start times are Friday 8 PM, Saturday 2 PM, and Sunday 12 PM (local time).',
      },
    ],
  },
];

/* ─── Section Component ──────────────────────────────────────── */
const GuideSectionCard = ({ section }: { section: GuideSection }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="border border-white/5 rounded-2xl bg-[#0a0a0c] overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-6 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
          {section.icon}
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="text-lg font-semibold text-white">{section.title}</h3>
          <p className="text-sm text-zinc-400 mt-0.5">{section.description}</p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-zinc-500"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6">
              {section.steps.map((step, index) => (
                <div key={index} className="relative pl-8 border-l border-white/10">
                  {/* Step number */}
                  <div className="absolute -left-3.5 top-0 w-7 h-7 rounded-full bg-[#111] border border-rose-500/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-rose-400">{index + 1}</span>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-base font-semibold text-white">{step.title}</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">{step.content}</p>

                    {step.screenshotPlaceholder && (
                      <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-4 text-center">
                        <p className="text-xs text-zinc-500 italic">{step.screenshotPlaceholder}</p>
                      </div>
                    )}

                    {step.tip && (
                      <div className="flex items-start gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                        <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-300">{step.tip}</p>
                      </div>
                    )}

                    {step.warning && (
                      <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">{step.warning}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ─── Page Component ─────────────────────────────────────────── */
const OrganizerGuide = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-rose-500/30">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-rose-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
      </div>

      <main className="relative z-10 flex-grow pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-6">
                <BookOpen className="w-4 h-4" />
                Organizer Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent mb-4">
                Host Your First Tournament
              </h1>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                Everything you need to know to create, manage, and run professional esports
                tournaments on Esportra — from setup to post-event analytics.
              </p>
            </motion.div>
          </div>

          {/* Quick Nav */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12 p-6 rounded-2xl bg-[#0a0a0c] border border-white/5"
          >
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              In this guide
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {guideSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                >
                  <div className="text-zinc-500 group-hover:text-rose-400 transition-colors">
                    {section.icon}
                  </div>
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                    {section.title}
                  </span>
                  <ChevronRight className="w-3 h-3 text-zinc-600 ml-auto group-hover:text-rose-400 transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Guide Sections */}
          <div className="space-y-4">
            {guideSections.map((section) => (
              <div key={section.id} id={section.id}>
                <GuideSectionCard section={section} />
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 text-center p-8 rounded-2xl bg-gradient-to-b from-rose-500/5 to-transparent border border-rose-500/10"
          >
            <Trophy className="w-10 h-10 text-rose-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Ready to get started?</h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              Apply for your organizer license and start building your competitive community today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/settings">
                <Button className="bg-rose-500 hover:bg-rose-600 text-white px-6">
                  Apply for License
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/about/faq">
                <Button variant="outline" className="border-white/10 text-zinc-300 hover:bg-white/5">
                  View FAQ
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Support Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-zinc-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@esportra.com" className="text-rose-400 hover:underline">
                support@esportra.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrganizerGuide;
