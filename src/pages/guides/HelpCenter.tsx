import React from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  BookOpen, Trophy, MapPin, Gamepad2, ArrowRight,
  HelpCircle, Mail, ChevronRight, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useLowFx } from '@/hooks/useLowFx';

/* ─── Guide Card Data ────────────────────────────────────────── */
interface GuideCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  tag?: string;
  available: boolean;
}

const guides: GuideCard[] = [
  {
    title: 'Organizer Guide',
    description:
      'Everything you need to host professional esports tournaments — from account setup and licensing to bracket management and post-event analytics.',
    icon: <Trophy className="w-6 h-6" />,
    href: '/guides/organizer',
    tag: 'Popular',
    available: true,
  },
  {
    title: 'Player Guide',
    description:
      'Learn how to find tournaments, register your team, check in, report scores, and climb the leaderboards.',
    icon: <Gamepad2 className="w-6 h-6" />,
    href: '/guides/player',
    available: false,
  },
  {
    title: 'Venue Owner Guide',
    description:
      'Set up your gaming venue, manage stations and bookings, and host LAN events through the Esportra platform.',
    icon: <MapPin className="w-6 h-6" />,
    href: '/guides/venue-owner',
    available: false,
  },
  {
    title: 'Be a Partner',
    description:
      'Learn about our partnership tiers, placement zones, analytics, and how to get your brand in front of thousands of competitive gamers.',
    icon: <Sparkles className="w-6 h-6" />,
    href: '/be-a-partner',
    tag: 'New',
    available: true,
  },
];

/* ─── Quick Link Data ────────────────────────────────────────── */
interface QuickLink {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

const quickLinks: QuickLink[] = [
  {
    title: 'FAQ',
    description: 'Common questions answered',
    icon: <HelpCircle className="w-5 h-5" />,
    href: '/about/faq',
  },
  {
    title: 'Contact Us',
    description: 'Get in touch with our team',
    icon: <Mail className="w-5 h-5" />,
    href: '/contact',
  },
];

/* ─── Page Component ─────────────────────────────────────────── */
const HelpCenter = () => {
  const isLowFx = useLowFx();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-rose-500/30">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {!isLowFx && (
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-rose-900/10 blur-[150px] rounded-full mix-blend-screen" />
        )}
        {!isLowFx && (
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150" />
        )}
      </div>

      <main className="relative z-10 flex-grow pt-32 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-6">
              <BookOpen className="w-4 h-4" />
              Help Center
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
              How can we help?
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Guides, tutorials, and resources to help you get the most out of the
              Esportra platform — whether you're organizing, competing, or hosting.
            </p>
          </motion.div>

          {/* Guide Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {guides.map((guide, i) => (
              <motion.div
                key={guide.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (i + 1) }}
              >
                {guide.available ? (
                  <Link to={guide.href} className="block h-full group">
                    <div className="relative h-full p-6 bg-[#0a0a0c] border border-white/5 hover:border-rose-500/20 transition-all duration-300 hover:-translate-y-1">
                      {guide.tag && (
                        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {guide.tag}
                        </span>
                      )}
                      <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4 group-hover:bg-rose-500/20 transition-colors">
                        {guide.icon}
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-rose-400 transition-colors">
                        {guide.title}
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                        {guide.description}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-rose-400 font-medium">
                        Read guide
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="relative h-full p-6 bg-[#0a0a0c]/60 border border-white/5 opacity-60">
                    <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                      Coming Soon
                    </span>
                    <div className="w-12 h-12 bg-zinc-500/10 border border-zinc-500/20 flex items-center justify-center text-zinc-500 mb-4">
                      {guide.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-400 mb-2">
                      {guide.title}
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">
                      {guide.description}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.title}
                  to={link.href}
                  className="flex items-center gap-4 p-4 bg-[#0a0a0c] border border-white/5 hover:border-rose-500/20 transition-all group"
                >
                  <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-rose-400 transition-colors">
                    {link.icon}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="text-sm font-semibold text-white">{link.title}</h3>
                    <p className="text-xs text-zinc-500">{link.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-rose-400 transition-colors" />
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Feature Request CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 text-center p-8 bg-rose-500/5 border border-rose-500/10"
          >
            <Sparkles className="w-8 h-8 text-rose-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Can't find what you need?</h2>
            <p className="text-zinc-400 mb-6 max-w-md mx-auto">
              We're constantly adding new guides and resources. Reach out and let us know how we can help.
            </p>
            <Link to="/contact">
              <Button className="bg-rose-500 hover:bg-rose-600 text-white px-6">
                Contact Support
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HelpCenter;
