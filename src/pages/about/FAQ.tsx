import React, { useState } from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    // General
    {
      category: 'General',
      question: "What is Esportra?",
      answer: "Esportra is an esports tournament management and venue booking platform. We connect players, tournament organizers, venue owners, and brand partners — providing tools for team management, automated brackets, real-time match tracking, and more."
    },
    {
      category: 'General',
      question: "Is Esportra free to use?",
      answer: "Yes. Creating an account, joining tournaments, forming teams, and browsing venues is completely free. Tournament organizers may charge entry fees for specific events, and some organizer features require a license."
    },
    {
      category: 'General',
      question: "What games does Esportra support?",
      answer: "Esportra supports any competitive game. We have built-in integrations for Valorant (map veto, agent data) and League of Legends, with more game-specific features coming soon. You can create tournaments for any title."
    },
    {
      category: 'General',
      question: "Is Esportra available on mobile?",
      answer: "Yes. The web app is fully responsive and works on all devices. We also have a native Android app available, with iOS coming soon."
    },
    // Players & Teams
    {
      category: 'Players & Teams',
      question: "How do I create a team?",
      answer: "Go to the Teams page and click 'Create Team'. You'll become the captain and can invite players via invite links or direct search. All team members need a verified Esportra account."
    },
    {
      category: 'Players & Teams',
      question: "How do I join a tournament?",
      answer: "Browse available tournaments on the Tournaments page. Click on one to see details, then hit 'Register'. For solo tournaments you register directly; for team tournaments your team captain registers the team. Some tournaments require an entry fee."
    },
    {
      category: 'Players & Teams',
      question: "How does check-in work?",
      answer: "Before a match begins, both participants must check in within the check-in window set by the organizer. You'll receive a notification when check-in opens. If a participant doesn't check in, they may forfeit the match."
    },
    {
      category: 'Players & Teams',
      question: "How do I report match results?",
      answer: "After a match, either participant can submit the result with a screenshot as evidence. The opponent can confirm or dispute the result. Tournament organizers can also manually set results."
    },
    {
      category: 'Players & Teams',
      question: "What if there's a dispute?",
      answer: "If a match result is disputed, both sides can submit evidence (screenshots, recordings). The tournament organizer reviews the evidence and makes a final ruling. For serious disputes, Esportra admins can intervene."
    },
    // Tournaments & Organizers
    {
      category: 'Tournaments',
      question: "How does the bracket system work?",
      answer: "We support Single Elimination, Double Elimination, and Round Robin formats. Brackets are generated automatically based on registrations and update in real-time as results come in. Organizers can also manually adjust seeding."
    },
    {
      category: 'Tournaments',
      question: "Can I host paid tournaments?",
      answer: "Yes. Verified organizers with an active license can create tournaments with entry fees and prize pools. Payment processing and distribution is handled through the platform."
    },
    {
      category: 'Tournaments',
      question: "What is map veto?",
      answer: "For games like Valorant, map veto lets teams take turns banning and picking maps before a match. The veto process happens in real-time through our platform with a visual interface showing the map pool."
    },
    {
      category: 'Tournaments',
      question: "How do organizer licenses work?",
      answer: "Tournament organizers need a license to access advanced features like paid tournaments, custom branding, and analytics. Licenses are managed through the platform — visit your organizer dashboard for details."
    },
    // Venues
    {
      category: 'Venues',
      question: "What are venues on Esportra?",
      answer: "Venues are physical gaming locations (LAN centers, esports arenas, gaming cafes) listed on our platform. Players can discover venues near them, view station availability, and book sessions or attend LAN events."
    },
    {
      category: 'Venues',
      question: "How do I list my venue?",
      answer: "Sign up as a venue owner, then go to your Venue Dashboard and click 'List a Venue'. Fill in your venue details, upload photos, set your station count and pricing, then submit for review. Our team approves listings within 48 hours."
    },
    // Partnerships
    {
      category: 'Partnerships',
      question: "How do partnerships work?",
      answer: "Esportra offers three partnership tiers — Partner, Ascendant, and Radiant — each with increasing visibility, analytics, and placement options. Partners get their brand featured across tournaments, the homepage, and match pages."
    },
    {
      category: 'Partnerships',
      question: "How do I become a partner?",
      answer: "Visit our 'Be a Partner' page to learn about tiers and benefits, then fill out the application form on the Partners page. Our team reviews applications and gets back to you within 48 hours."
    },
    {
      category: 'Partnerships',
      question: "What is the Partner Portal?",
      answer: "Every approved partner gets access to a dedicated dashboard at partners.esportra.com where you can manage your brand profile, upload assets, track impression and click analytics, and view your active tournament placements."
    },
    // Account & Security
    {
      category: 'Account',
      question: "How do I verify my account?",
      answer: "After signing up, check your email for a verification link. Click it to verify your account. A verified account is required to create teams, register for tournaments, and access organizer features."
    },
    {
      category: 'Account',
      question: "I found a bug. How do I report it?",
      answer: "Since we're in beta, we appreciate all bug reports! Join our Discord server and post in the bug reports channel. Our team actively monitors it and works to fix issues as quickly as possible."
    },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(filteredFaqs.map(f => f.category))];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-cyan-500/30">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-cyan-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <main className="relative z-10 flex-grow pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-extrabold font-heading mb-6">Frequently Asked <span className="text-cyan-400">Questions</span></h1>
              <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Everything you need to know about the platform.
              </p>

              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                <Input
                  placeholder="Search for answers..."
                  className="bg-white/5 border-white/10 focus:border-rose-500/50 pl-12 h-14 text-lg transition-all focus:bg-white/10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </motion.div>
          </div>

          {/* FAQ List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-4"
          >
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AnimatePresence>
                {categories.map((category) => (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400/80 mt-6 mb-2 px-1">{category}</h3>
                    {filteredFaqs.filter(f => f.category === category).map((faq, index) => (
                      <AccordionItem key={`${category}-${index}`} value={`${category}-${index}`} className="border border-white/10 rounded-xl bg-white/5 px-6 overflow-hidden data-[state=open]:border-cyan-500/30 data-[state=open]:bg-white/[0.07] transition-all duration-300">
                        <AccordionTrigger className="hover:no-underline py-6 text-lg font-medium text-left [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:text-cyan-400">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-400 pb-6 text-base leading-relaxed">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </motion.div>
                ))}
              </AnimatePresence>
            </Accordion>

            {filteredFaqs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                No results found for "{searchQuery}"
              </div>
            )}
          </motion.div>

          {/* Support CTA */}
          <div className="mt-20 text-center">
            <div className="inline-flex flex-col items-center p-8 bg-[#0a0a0c] border border-white/10">
              <h2 className="text-xl font-bold font-heading mb-2">Still need help?</h2>
              <p className="text-gray-400 mb-6">Join our Discord community or reach out to our support team.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="https://discord.gg/ZMBvC5vjRF" target="_blank" rel="noopener noreferrer">
                  <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full px-8 h-10 font-medium">
                    Join Discord
                  </Button>
                </a>
                <a href="/about/contact">
                  <Button variant="outline" className="border-white/20 hover:bg-white/10 rounded-full px-8 h-10 font-medium">
                    Contact Support
                  </Button>
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
