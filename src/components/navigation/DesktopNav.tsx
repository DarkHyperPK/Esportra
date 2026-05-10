import { Link } from "react-router-dom";
import { MapPin, Trophy, Info, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
// import { useNotifications } from "@/components/NotificationContext"; // No longer needed here
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import UserMenu from "./UserMenu";

import { FramerDropdownRoot, FramerDropdownTrigger, FramerDropdownContent, FramerDropdownItem } from "@/components/ui/FramerDropdown";

const DesktopNav = ({
  handleSignOut
}: {
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const userRole = currentRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');

  const menuItemClass =
    "w-full rounded-2xl px-4 py-2 text-[0.75rem] font-semibold text-white/70 transition-all focus:text-white hover:text-white hover:bg-white/10 focus:bg-white/10";

  return (
    <div className="hidden lg:flex items-center gap-5 font-heading font-medium">

      {/* Dropdown: Venues */}
      <FramerDropdownRoot>
        <FramerDropdownTrigger className="group inline-flex items-center gap-2 text-base font-semibold text-white transition-colors hover:text-white/80 outline-none">
          <MapPin className="h-4 w-4" />
          Venues
        </FramerDropdownTrigger>
        <FramerDropdownContent className="min-w-[220px]">
          <FramerDropdownItem to="/venues/search">Find Venues</FramerDropdownItem>
          <FramerDropdownItem to="/venues/featured">Featured Venues</FramerDropdownItem>
          {(userRole === 'venue_owner' || isSuperAdmin || admin.hasPermission('venues:view')) && (
            <>
              <FramerDropdownItem to="/venues/list-venue">List Your Venue</FramerDropdownItem>
              <FramerDropdownItem to="/venues/dashboard">Venue Dashboard</FramerDropdownItem>
            </>
          )}
        </FramerDropdownContent>
      </FramerDropdownRoot>

      {/* Dropdown: Tournaments */}
      <FramerDropdownRoot>
        <FramerDropdownTrigger className="group inline-flex items-center gap-2 text-base font-semibold text-white transition-colors hover:text-white/80 outline-none">
          <Trophy className="h-4 w-4" />
          Tournaments
        </FramerDropdownTrigger>
        <FramerDropdownContent className="min-w-[220px]">
          <FramerDropdownItem to="/tournaments">Browse Tournaments</FramerDropdownItem>
          {(userRole === 'organizer' || isSuperAdmin || admin.hasPermission('tournaments:create')) && (
            <>
              <div className="h-px bg-white/10 my-1 mx-2" />
              <FramerDropdownItem to="/organizer/tournaments">Manage Tournaments</FramerDropdownItem>
              <FramerDropdownItem to="/tournaments/create">Create Tournament</FramerDropdownItem>
              <div className="h-px bg-white/10 my-1 mx-2" />
              <FramerDropdownItem to="/organizer/seasons">Manage Seasons</FramerDropdownItem>
              <FramerDropdownItem to="/tournaments/create?mode=season">Create Season</FramerDropdownItem>
            </>
          )}
        </FramerDropdownContent>
      </FramerDropdownRoot>

      {/* Nav Link: Leaderboards */}
      <Link to="/leaderboards" className="inline-flex items-center gap-2 text-base font-semibold text-white transition-colors hover:text-white/80">
        <Medal className="h-4 w-4" />
        Leaderboards
      </Link>

      {/* Dropdown: About */}
      <FramerDropdownRoot>
        <FramerDropdownTrigger className="group inline-flex items-center gap-2 text-base font-semibold text-white transition-colors hover:text-white/80 outline-none">
          <Info className="h-4 w-4" />
          About
        </FramerDropdownTrigger>
        <FramerDropdownContent className="min-w-[200px]">
          <FramerDropdownItem to="/about/company">About Us</FramerDropdownItem>
          <FramerDropdownItem to="/about/contact">Contact</FramerDropdownItem>
          <FramerDropdownItem to="/about/faq">FAQ</FramerDropdownItem>
        </FramerDropdownContent>
      </FramerDropdownRoot>

      {/* Nav Link: Partners */}
      <Link to="/partners" className="text-base font-semibold text-white transition-colors hover:text-white/80">
        Partners
      </Link>

      {/* Admin Dashboard link — visible to all admins */}
      {admin.isAdmin && (
        <Link to="/admin/dashboard" className="text-base font-semibold text-rose-400 transition-colors hover:text-rose-300">
          Admin
        </Link>
      )}


      {user ? (
        <>

          {/* Notification Dropdown */}
          <NotificationDropdown />

          <UserMenu handleSignOut={handleSignOut} />
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-white/30 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/auth/signin">Log In</Link>
          </Button>
          <Button
            className="bg-gradient-to-r from-[#f43f5e] to-[#fb7185] text-white shadow-[0_15px_40px_rgba(244,63,94,0.35)] hover:from-[#fb7185] hover:to-[#f43f5e]"
            asChild
          >
            <Link to="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      )}

    </div>
  );
};

export default DesktopNav;
