
import React, { useState } from 'react';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, MapPin, Send, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

const ContactPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Message Sent",
        description: "We'll get back to you as soon as possible.",
      });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 font-sans">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-900/10 blur-[130px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-900/10 blur-[130px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <main className="relative z-10 container mx-auto px-4 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-start max-w-6xl mx-auto">

          {/* Left Column: Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-extrabold font-heading mb-6 tracking-tight">
              Let's <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Connect</span>
            </h1>
            <p className="text-xl text-gray-400 mb-12 leading-relaxed">
              Have questions about organizing a tournament or joining a team?
              Our support crew is ready to assist you.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading mb-1">Email Support</h3>
                  <p className="text-gray-400 mb-2">For general inquiries and assistance.</p>
                  <a href="mailto:support@esportra.com" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">support@esportra.com</a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors">
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading mb-1">Partnerships</h3>
                  <p className="text-gray-400 mb-2">For venue owners and sponsors.</p>
                  <a href="mailto:partnerships@esportra.com" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">business@esportra.com</a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 transition-colors">
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading mb-1">HQ</h3>
                  <p className="text-gray-400">Somewhere in the Cloud<br />Digital Realm, Internet</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-8 md:p-10 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-[50px] rounded-full pointer-events-none" />

            <h2 className="text-2xl font-bold font-heading mb-6">Send a Message</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">Name</label>
                  <Input placeholder="Your name" className="bg-black/20 border-white/10 focus:border-purple-500/50 h-12 rounded-xl" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-1">Email</label>
                  <Input type="email" placeholder="you@example.com" className="bg-black/20 border-white/10 focus:border-purple-500/50 h-12 rounded-xl" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Subject</label>
                <Select>
                  {/* Select wrapper if needed, using simple Input for now or Select from shadcn */}
                  <Input placeholder="General Inquiry" className="bg-black/20 border-white/10 focus:border-purple-500/50 h-12 rounded-xl" />
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Message</label>
                <Textarea placeholder="How can we help?" className="bg-black/20 border-white/10 focus:border-purple-500/50 min-h-[150px] rounded-xl resize-none" required />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-lg font-medium transition-all shadow-lg hover:shadow-purple-500/25"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send Message <Send className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
          </motion.div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

// Helper for select (simplified for this specific file replacement)
const Select = ({ children }: { children: React.ReactNode }) => <div className="relative">{children}</div>;

export default ContactPage;
