import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "./navigation/MobileNav";
import DesktopNav from "./navigation/DesktopNav";
import { BurgerMenu } from "./ui/BurgerMenu";
import { motion, AnimatePresence } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isManageBracketPage = location.pathname.includes('/manage-bracket/');
  const isLandingPage = location.pathname === '/';

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

  return (
    <motion.nav
      data-mounted
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={`${isLandingPage ? 'fixed top-0 left-0 right-0' : 'relative'} z-[999]`}
    >
      <div className={`max-w-6xl mx-auto w-full px-4 sm:px-8 ${isLandingPage ? 'py-1' : 'py-3'}`}>
        <div
          className={`relative flex w-full items-center justify-between rounded-3xl border border-white/10 shadow-lg transition-all duration-300 ${isScrolled
            ? "bg-[#0a0a0c]/85 backdrop-blur-lg border-white/5"
            : "bg-[#0a0a0c]/60 backdrop-blur-md"
            }`}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent" />
          </div>
          <div className="relative z-10 flex w-full items-center justify-between px-6 py-3 text-white">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2 select-none">
                <img
                  src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
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
