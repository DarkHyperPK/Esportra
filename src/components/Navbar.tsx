import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "./navigation/MobileNav";
import DesktopNav from "./navigation/DesktopNav";
import { BurgerMenu } from "./ui/BurgerMenu";
import { AnimatePresence } from "framer-motion";
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
    <nav
      data-mounted
      className={`${isLandingPage ? 'fixed top-0 left-0 right-0' : 'relative'} z-[999]`}
    >
      <div className={`max-w-6xl mx-auto w-full px-4 sm:px-8 ${isLandingPage ? 'py-1' : 'py-3'}`}>
        <div
          className={`relative flex w-full items-center justify-between rounded-none border border-white/10 shadow-lg transition-colors duration-200 ${isScrolled
            ? "bg-black/95 border-rose-500/25"
            : "bg-black/85"
            }`}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
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
            <div className="lg:hidden">
              <BurgerMenu
                isOpen={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="bg-white/5 hover:bg-white/10 text-white"
              />
            </div>
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
    </nav>
  );
};

export default Navbar;
