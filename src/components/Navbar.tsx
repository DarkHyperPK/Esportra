import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "./navigation/MobileNav";
import DesktopNav from "./navigation/DesktopNav";
import { BurgerMenu } from "./ui/BurgerMenu";
import { AnimatePresence } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
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
    <nav data-mounted className={cn(isLandingPage ? 'fixed left-0 right-0 top-0' : 'sticky top-0', 'z-[999]')}>
      <div className={cn('mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-8', isLandingPage ? 'py-4' : 'py-4')}>
        <div
          className={cn(
            'relative flex w-full items-center justify-between border shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-300',
            isScrolled
              ? 'border-rose-500/40 bg-black/95 shadow-rose-950/20'
              : 'border-white/10 bg-black/85'
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px] opacity-70" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/70 to-transparent" />
            <div className="absolute bottom-0 left-0 h-px w-1/3 bg-rose-500" />
          </div>
          <div className="relative z-10 flex w-full items-center justify-between gap-5 px-4 py-3 text-white sm:px-5 lg:px-6">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="group flex min-h-12 items-center gap-3 border border-white/10 bg-white/[0.02] px-3 outline-none transition-colors duration-200 hover:border-rose-500/50 hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-500/70">
                <span className="flex h-9 w-9 items-center justify-center border border-white/10 bg-black">
                  <span className="h-2 w-2 bg-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.95)]" />
                </span>
                <img
                  src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                  alt="Esportra Logo"
                  className="h-9 w-auto sm:h-10"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <DesktopNav handleSignOut={handleSignOut} />

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <BurgerMenu isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="bg-black text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] hover:bg-white/10" />
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
