import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "./navigation/MobileNav";
import DesktopNav from "./navigation/DesktopNav";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error signing out",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.nav 
      data-mounted
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-50"
    >
      <div className="w-full px-4 py-3 sm:px-8">
        <div className="relative flex w-full items-center justify-between overflow-hidden rounded-[32px] border border-white/10 bg-[#020203] shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_60%)]" />
          </div>
          <div className="relative z-10 flex w-full items-center justify-between px-6 py-3 text-white">
        {/* Logo and Brand */}
        <motion.div 
          className="flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link to="/" className="flex items-center gap-2 select-none">
            <motion.img 
              src="/logo.svg" 
              alt="Esportra Logo" 
              className="h-8 w-8"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            />
            <span className="text-base font-semibold tracking-[0.2em] text-white uppercase">
              Esportra
            </span>
          </Link>
        </motion.div>

        {/* Desktop Navigation */}
        <DesktopNav handleSignOut={handleSignOut} />

        {/* Mobile menu button */}
        <motion.div 
          className="lg:hidden"
          whileTap={{ scale: 0.9 }}
        >
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <motion.svg 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              animate={{ rotate: mobileMenuOpen ? 90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </motion.svg>
          </button>
        </motion.div>
      </div>

        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <MobileNav 
            isOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)} 
            handleSignOut={handleSignOut}
          />
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;