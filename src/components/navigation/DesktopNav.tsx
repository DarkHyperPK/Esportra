import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Handshake, Info, LogIn, MapPin, Medal, Plus, Shield, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
// import { useNotifications } from "@/components/NotificationContext"; // No longer needed here
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import UserMenu from "./UserMenu";
import { cn } from "@/lib/utils";

import { FramerDropdownRoot, FramerDropdownTrigger, FramerDropdownContent, FramerDropdownItem } from "@/components/ui/FramerDropdown";

const DesktopNav = ({
  handleSignOut
}: {
  handleSignOut: () => Promise<void>;
}) => {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const location = useLocation();
  const userRole = currentRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
  const canManageVenues = userRole === 'venue_owner' || isSuperAdmin || admin.hasPermission('venues:view');
  const canManageTournaments = userRole === 'organizer' || isSuperAdmin || admin.hasPermission('tournaments:create');

  const isActive = (paths: string[]) => paths.some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const navPillClass = (active: boolean) => cn(
    "group inline-flex min-h-11 items-center gap-2 border px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-rose-500/70",
    active
      ? "border-rose-500 bg-rose-500 text-white shadow-[0_16px_40px_rgba(244,63,94,0.22)]"
      : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.04] hover:text-white"
  );

  return (
    <div className="hidden items-center gap-2 font-heading font-medium lg:flex">

      {/* Dropdown: Venues */}
      <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e">
        <FramerDropdownTrigger asChild>
          <button type="button" className={navPillClass(isActive(['/venues']))}>
            <MapPin className="h-4 w-4 text-rose-300" />
            Venues
            <ChevronDown className="h-3.5 w-3.5 text-white/45 transition-transform duration-200 group-hover:text-white/75" />
          </button>
        </FramerDropdownTrigger>
        <FramerDropdownContent className="min-w-[240px] rounded-none border-white/10 bg-[#09090b]/98 shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
          <FramerDropdownItem to="/venues/search">Find Venues</FramerDropdownItem>
          <FramerDropdownItem to="/venues/featured">Featured Venues</FramerDropdownItem>
          {canManageVenues && (
            <>
              <FramerDropdownItem to="/venues/list-venue">List Your Venue</FramerDropdownItem>
              <FramerDropdownItem to="/venues/dashboard">Venue Dashboard</FramerDropdownItem>
            </>
          )}
        </FramerDropdownContent>
      </FramerDropdownRoot>

      {/* Dropdown: Tournaments */}
      <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e">
        <FramerDropdownTrigger asChild>
          <button type="button" className={navPillClass(isActive(['/tournaments', '/organizer/tournaments', '/organizer/seasons', '/season']))}>
            <Trophy className="h-4 w-4 text-rose-300" />
            Tournaments
            <ChevronDown className="h-3.5 w-3.5 text-white/45 transition-transform duration-200 group-hover:text-white/75" />
          </button>
        </FramerDropdownTrigger>
        <FramerDropdownContent className="min-w-[250px] rounded-none border-white/10 bg-[#09090b]/98 shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
          <FramerDropdownItem to="/tournaments">Browse Tournaments</FramerDropdownItem>
          {canManageTournaments && (
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
      <Link to="/leaderboards" className={navPillClass(isActive(['/leaderboards']))}>
        <Medal className="h-4 w-4 text-rose-300" />
        Leaderboards
      </Link>

      {/* Dropdown: About */}
      <FramerDropdownRoot borderRadius={0} accentColor="#f43f5e">
        <FramerDropdownTrigger asChild>
          <button type="button" className={navPillClass(isActive(['/about']))}>
            <Info className="h-4 w-4 text-rose-300" />
            About
            <ChevronDown className="h-3.5 w-3.5 text-white/45 transition-transform duration-200 group-hover:text-white/75" />
          </button>
        </FramerDropdownTrigger>
        <FramerDropdownContent className="min-w-[220px] rounded-none border-white/10 bg-[#09090b]/98 shadow-[0_24px_70px_rgba(0,0,0,0.75)]">
          <FramerDropdownItem to="/about/company">About Us</FramerDropdownItem>
          <FramerDropdownItem to="/about/contact">Contact</FramerDropdownItem>
          <FramerDropdownItem to="/about/faq">FAQ</FramerDropdownItem>
        </FramerDropdownContent>
      </FramerDropdownRoot>

      {/* Nav Link: Partners */}
      <Link to="/partners" className={navPillClass(isActive(['/partners']))}>
        <Handshake className="h-4 w-4 text-rose-300" />
        Partners
      </Link>

      {/* Admin Dashboard link — visible to all admins */}
      {admin.isAdmin && (
        <Link to="/admin/dashboard" className={cn(navPillClass(isActive(['/admin'])), "border-rose-500/40 text-rose-200 hover:bg-rose-500/10")}>
          <Shield className="h-4 w-4" />
          Admin
        </Link>
      )}


      {user ? (
        <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-3">

          {/* Notification Dropdown */}
          <NotificationDropdown />

          <UserMenu handleSignOut={handleSignOut} />
        </div>
      ) : (
        <div className="ml-2 flex items-center gap-2 border-l border-white/10 pl-3">
          <Button
            variant="outline"
            className="min-h-11 rounded-none border-white/15 bg-black px-4 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link to="/auth/signin">
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </Link>
          </Button>
          <Button
            className="min-h-11 rounded-none bg-white px-4 font-mono text-[11px] font-bold uppercase tracking-wider text-black shadow-[0_16px_40px_rgba(255,255,255,0.12)] hover:bg-rose-500 hover:text-white hover:shadow-[0_18px_45px_rgba(244,63,94,0.3)]"
            asChild
          >
            <Link to="/auth/signup">
              <Plus className="mr-2 h-4 w-4" />
              Sign Up
            </Link>
          </Button>
        </div>
      )}

    </div>
  );
};

export default DesktopNav;
