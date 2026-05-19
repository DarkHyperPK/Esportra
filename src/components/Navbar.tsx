import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const isLandingPage = location.pathname === "/";

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth/signin");
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
    <nav
      data-mounted
      className={cn(
        "z-[999] px-3 sm:px-6",
        isLandingPage ? "fixed inset-x-0 top-4" : "sticky top-4"
      )}
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between rounded-full border border-white/10 bg-black/80 px-3 pl-5 pr-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-4 sm:pl-6 sm:pr-4">
        <DesktopNav handleSignOut={handleSignOut} />

        <Link to="/" className="flex items-center lg:hidden">
          <img
            src={getWebsiteAssetUrl("eSportra-Logo/eSPORTRA-white-transparent.png")}
            alt="Esportra"
            className="h-6 w-auto"
          />
        </Link>

        <div className="lg:hidden">
          <BurgerMenu
            isOpen={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="!h-10 !w-10"
          />
        </div>
      </div>

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
