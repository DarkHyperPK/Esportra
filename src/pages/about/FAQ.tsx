import React, { useState } from 'react';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, HelpCircle, ChevronRight } from 'lucide-react';
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
    {
      question: "What is Esportra?",
      answer: "Esportra is a premier competitive platform connecting gamers, organizers, and venues. We provide professional-grade tools for team management, automated brackets, and tournament hosting."
    },
    {
      question: "How do I create a team?",
      answer: "Navigate to your player dashboard and select 'Create Team'. You'll become the captain and can generate invite links for your roster. All members must have verified accounts."
    },
    {
      question: "Can I host paid tournaments?",
      answer: "Yes. Verified organizers can host tournaments with entry fees and prize pools. We handle the secure payment processing and payout distribution automatically."
    },
    {
      question: "How does the bracket system work?",
      answer: "Our automated engine supports Single Elimination, Double Elimination, and Round Robin formats. Brackets update in real-time as match results are verified."
    },
    {
      question: "What anti-cheat measures are in place?",
      answer: "We use a combination of automated detection integration (where available) and a strict dispute resolution system handled by tournament admins to ensure competitive integrity."
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-cyan-500/30">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-cyan-900/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
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
                  className="bg-white/5 border-white/10 focus:border-cyan-500/50 pl-12 h-14 rounded-2xl text-lg backdrop-blur-sm transition-all focus:bg-white/10"
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
                {filteredFaqs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AccordionItem value={`item-${index}`} className="border border-white/10 rounded-xl bg-white/5 px-6 overflow-hidden data-[state=open]:border-cyan-500/30 data-[state=open]:bg-white/[0.07] transition-all duration-300">
                      <AccordionTrigger className="hover:no-underline py-6 text-lg font-medium text-left [&[data-state=open]>svg]:rotate-180 [&[data-state=open]]:text-cyan-400">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-400 pb-6 text-base leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
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
            <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-gradient-to-br from-white/5 to-transparent border border-white/10">
              <h2 className="text-xl font-bold font-heading mb-2">Still need help?</h2>
              <p className="text-gray-400 mb-6">Our team is available 24/7 to assist you.</p>
              <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-8 h-10 font-medium">
                Contact Support
              </Button>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
