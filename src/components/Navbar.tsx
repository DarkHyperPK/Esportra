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
      <div className={cn('mx-auto w-full max-w-[1400px] px-3 sm:px-6 lg:px-8', isLandingPage ? 'py-3' : 'py-4')}>
        <div
          className={cn(
            'relative flex w-full items-center justify-between overflow-hidden rounded-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-all duration-300',
            isScrolled
              ? 'border-rose-500/25 bg-[#050505]/90 shadow-rose-950/20'
              : 'border-white/10 bg-[#0a0a0c]/70'
          )}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(244,63,94,0.18),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.08),transparent_24%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" />
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          </div>
          <div className="relative z-10 flex w-full items-center justify-between gap-5 px-4 py-3 text-white sm:px-5 lg:px-6">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Link to="/" className="group flex min-h-12 items-center gap-3 rounded-2xl px-2 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-rose-500/70">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 group-hover:border-rose-400/40 group-hover:bg-rose-500/10">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.95)]" />
                </span>
                <img
                  src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                  alt="Esportra Logo"
                  className="h-9 w-auto transition-transform duration-200 group-hover:translate-x-0.5 sm:h-10"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <DesktopNav handleSignOut={handleSignOut} />

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <BurgerMenu isOpen={mobileMenuOpen} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="bg-white/5 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] hover:bg-white/10" />
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
