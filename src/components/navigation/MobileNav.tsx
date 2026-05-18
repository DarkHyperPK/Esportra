import { Link, useLocation } from "react-router-dom";
import { Bell, ChevronDown, LogOut, MapPin, Medal, Plus, Shield, Trophy, User, Info, Handshake } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useNotifications } from "@/components/NotificationContext";
import { UserRole } from "@/types/auth";
import RoleSwitcher from "@/components/RoleSwitcher";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const MobileNav = ({
  isOpen,
  onClose,
  handleSignOut,
}: {
  isOpen: boolean;
  onClose: () => void;
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const userRole = currentRole as UserRole;
  const isSuperAdmin = admin.isAdmin && admin.roles.includes("super_admin");
  const canManageVenues =
    userRole === "venue_owner" || isSuperAdmin || admin.hasPermission("venues:view");
  const canManageTournaments =
    userRole === "organizer" || isSuperAdmin || admin.hasPermission("tournaments:create");

  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const toggleMenu = (menu: string) => setExpandedMenu(expandedMenu === menu ? null : menu);

  const isActive = (paths: string[]) =>
    paths.some(
      (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`)
    );

  const linkClass = (active: boolean) =>
    cn(
      "flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium outline-none transition-colors",
      active ? "text-white" : "text-zinc-400 hover:text-white"
    );

  const subLinkClass = (active: boolean) =>
    cn(
      "block px-3 py-2 text-sm outline-none transition-colors",
      active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
    );

  const accordionMotion = {
    initial: { opacity: 0, height: 0 },
    animate: { opacity: 1, height: "auto" },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.2 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 top-16 z-[998] border-b border-white/[0.06] bg-[#0a0a0c] lg:hidden"
        >
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-3">
            {/* Main nav */}
            <div className="space-y-0.5">
              {/* Venues */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMenu("venues")}
                  className={linkClass(isActive(["/venues"]))}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Venues
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expandedMenu === "venues" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedMenu === "venues" && (
                    <motion.div {...accordionMotion} className="overflow-hidden">
                      <div className="border-l border-white/10 ml-4 pl-4 space-y-0.5">
                        <Link to="/venues/search" className={subLinkClass(isActive(["/venues/search"]))} onClick={onClose}>Find Venues</Link>
                        <Link to="/venues/featured" className={subLinkClass(isActive(["/venues/featured"]))} onClick={onClose}>Featured Venues</Link>
                        {canManageVenues && (
                          <>
                            <Link to="/venues/list-venue" className={subLinkClass(isActive(["/venues/list-venue"]))} onClick={onClose}>List Your Venue</Link>
                            <Link to="/venues/manage" className={subLinkClass(isActive(["/venues/manage"]))} onClick={onClose}>Manage Venues</Link>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tournaments */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMenu("tournaments")}
                  className={linkClass(
                    isActive([
                      "/tournaments",
                      "/organizer/tournaments",
                      "/organizer/seasons",
                      "/season",
                    ])
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Tournaments
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expandedMenu === "tournaments" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedMenu === "tournaments" && (
                    <motion.div {...accordionMotion} className="overflow-hidden">
                      <div className="border-l border-white/10 ml-4 pl-4 space-y-0.5">
                        <Link to="/tournaments" className={subLinkClass(isActive(["/tournaments"]))} onClick={onClose}>Browse Tournaments</Link>
                        {canManageTournaments && (
                          <>
                            <Link to="/organizer/tournaments" className={subLinkClass(isActive(["/organizer/tournaments"]))} onClick={onClose}>Manage Tournaments</Link>
                            <Link to="/tournaments/create" className={subLinkClass(isActive(["/tournaments/create"]))} onClick={onClose}>Create Tournament</Link>
                            <Link to="/organizer/seasons" className={subLinkClass(isActive(["/organizer/seasons"]))} onClick={onClose}>Manage Seasons</Link>
                            <Link to="/tournaments/create?mode=season" className={subLinkClass(location.pathname === "/tournaments/create" && location.search.includes("mode=season"))} onClick={onClose}>Create Season</Link>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Leaderboards */}
              <Link to="/leaderboards" className={linkClass(isActive(["/leaderboards"]))} onClick={onClose}>
                <span className="flex items-center gap-2">
                  <Medal className="h-4 w-4" />
                  Leaderboards
                </span>
              </Link>

              {/* About */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleMenu("about")}
                  className={linkClass(isActive(["/about"]))}
                >
                  <span className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    About
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expandedMenu === "about" ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {expandedMenu === "about" && (
                    <motion.div {...accordionMotion} className="overflow-hidden">
                      <div className="border-l border-white/10 ml-4 pl-4 space-y-0.5">
                        <Link to="/about/company" className={subLinkClass(isActive(["/about/company"]))} onClick={onClose}>About Us</Link>
                        <Link to="/about/contact" className={subLinkClass(isActive(["/about/contact"]))} onClick={onClose}>Contact</Link>
                        <Link to="/about/faq" className={subLinkClass(isActive(["/about/faq"]))} onClick={onClose}>FAQ</Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Partners */}
              <Link to="/partners" className={linkClass(isActive(["/partners"]))} onClick={onClose}>
                <span className="flex items-center gap-2">
                  <Handshake className="h-4 w-4" />
                  Partners
                </span>
              </Link>
            </div>

            {user && (
              <>
                <div className="my-3 h-px bg-white/[0.06]" />

                {userRole !== "admin" && (
                  <div className="mb-3">
                    <RoleSwitcher />
                  </div>
                )}

                <div className="space-y-0.5">
                  <Link to="/user/profile" className={linkClass(isActive(["/user/profile"]))} onClick={onClose}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      My Profile
                    </span>
                  </Link>
                  <Link to="/notifications" className={linkClass(isActive(["/notifications"]))} onClick={onClose}>
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link to="/player/teams" className={linkClass(isActive(["/player/teams"]))} onClick={onClose}>
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your Team
                    </span>
                  </Link>
                </div>

                {profile?.role === "admin" && (
                  <div className="mt-2 space-y-0.5">
                    <Link to="/admin/dashboard" className={linkClass(isActive(["/admin"]))} onClick={onClose}>
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </span>
                    </Link>
                  </div>
                )}
                {userRole === "venue_owner" && !isSuperAdmin && (
                  <div className="mt-2 space-y-0.5">
                    <Link to="/venues/manage" className={linkClass(isActive(["/venues/manage"]))} onClick={onClose}>
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        My Venues
                      </span>
                    </Link>
                    <Link to="/venues/list-venue" className={linkClass(isActive(["/venues/list-venue"]))} onClick={onClose}>
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        List New Venue
                      </span>
                    </Link>
                  </div>
                )}
                {userRole === "organizer" && !isSuperAdmin && (
                  <div className="mt-2 space-y-0.5">
                    <Link to="/organizer/tournaments" className={linkClass(isActive(["/organizer/tournaments"]))} onClick={onClose}>
                      <span className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Manage Tournaments
                      </span>
                    </Link>
                    <Link to="/tournaments/create" className={linkClass(isActive(["/tournaments/create"]))} onClick={onClose}>
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Tournament
                      </span>
                    </Link>
                  </div>
                )}

                <div className="my-3 h-px bg-white/[0.06]" />
                <button
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                  onClick={() => {
                    onClose();
                    handleSignOut();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            )}

            {!user && (
              <div className="mt-3 flex items-center gap-3 border-t border-white/[0.06] pt-3">
                <Link
                  to="/auth/signin"
                  className="flex-1 rounded-md border border-white/10 py-2 text-center text-sm font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
                  onClick={onClose}
                >
                  Log in
                </Link>
                <Link
                  to="/auth/signup"
                  className="flex-1 rounded-md bg-rose-500 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-rose-600"
                  onClick={onClose}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileNav;
