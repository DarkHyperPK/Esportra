import { Link } from "react-router-dom";
import { MapPin, Trophy, Info, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useNotifications } from "@/components/NotificationContext";
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
  const { unreadCount } = useNotifications();
  const userRole = currentRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');

  const menuItemClass =
    "w-full rounded-2xl px-4 py-2 text-[0.75rem] font-semibold text-white/70 transition-all focus:text-white hover:text-white hover:bg-white/10 focus:bg-white/10";

  return (
    <div className="hidden lg:flex items-center gap-6 font-heading font-medium">

      {/* Nav Link: Home */}
      <Link to="/" className="text-base font-semibold text-white transition-colors">
        Home
      </Link>

      {/* Dropdown: Venues */}
      <FramerDropdownRoot>
        <FramerDropdownTrigger className="group inline-flex items-center gap-2 text-base font-semibold text-white transition-colors hover:text-white/80 outline-none">
          <MapPin className="h-4 w-4" />
          Venues
        </FramerDropdownTrigger>
        <FramerDropdownContent className="min-w-[220px]">
          <FramerDropdownItem to="/venues/search">Find Venues</FramerDropdownItem>
          <FramerDropdownItem to="/venues/featured">Featured Venues</FramerDropdownItem>
          {(userRole === 'venue_owner' || isSuperAdmin) && (
            <FramerDropdownItem to="/venues/list-venue">List Your Venue</FramerDropdownItem>
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
          <FramerDropdownItem to="/tournaments/upcoming">Upcoming Tournaments</FramerDropdownItem>
          <FramerDropdownItem to="/tournaments/ongoing">Live Tournaments</FramerDropdownItem>
          <FramerDropdownItem to="/tournament-history">Tournament History</FramerDropdownItem>
          {(userRole === 'organizer' || isSuperAdmin) && (
            <>
              <div className="h-px bg-white/10 my-1 mx-2" />
              <FramerDropdownItem to="/organizer/tournaments">Manage Tournaments</FramerDropdownItem>
              <FramerDropdownItem to="/tournaments/create">Create Tournament</FramerDropdownItem>
            </>
          )}
        </FramerDropdownContent>
      </FramerDropdownRoot>

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



      {user ? (
        <>
          {/* Notification Bell */}
          <Link
            to="/notifications"
            className="relative rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

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
