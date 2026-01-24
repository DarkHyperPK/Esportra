import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "./navigation/MobileNav";
import DesktopNav from "./navigation/DesktopNav";
import { BurgerMenu } from "./ui/BurgerMenu";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isManageBracketPage = location.pathname.includes('/manage-bracket/');

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

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLandingPage = location.pathname === '/';

  return (
    <motion.nav
      data-mounted
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`${isManageBracketPage ? 'relative' : (isLandingPage ? 'fixed top-0 w-full' : 'sticky top-0')} z-[999]`}
    >
      <div className="max-w-5xl mx-auto w-full px-4 py-3 sm:px-8">
        <div
          className={`relative flex w-full items-center justify-between rounded-3xl border border-white/10 shadow-lg transition-all duration-300 ${isScrolled
            ? "bg-[#121212]/90 backdrop-blur-md border-white/5"
            : "bg-black/20 backdrop-blur-xl"
            }`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-20 overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,80,200,0.08),_transparent_60%)]" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
          </div>
          <div className="relative z-10 flex w-full items-center justify-between px-6 py-3 text-white">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 select-none">
                <img
                  src="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/eSportra%20Logo/eSPORTRA%20white%20transparent.png"
                  alt="Esportra Logo"
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <DesktopNav handleSignOut={handleSignOut} />

            {/* Mobile menu button */}
            <motion.div
              className="lg:hidden"
              whileTap={{ scale: 0.9 }}
            >
              <BurgerMenu
                isOpen={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="bg-white/5 hover:bg-white/10 text-white"
              />
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