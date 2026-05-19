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
      "flex w-full items-center justify-between px-3 py-3 text-sm font-medium outline-none transition-colors",
      active ? "text-white" : "text-white/85 hover:text-white"
    );

  const JackSubItem = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      onClick={onClose}
      className="group relative block w-full overflow-hidden bg-white px-4 py-2.5 text-left font-mono text-[11px] font-bold uppercase tracking-wider text-black"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
    </Link>
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
          className="fixed inset-x-3 top-[5.25rem] z-[998] rounded-3xl border border-white/10 bg-black/95 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl lg:hidden"
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
                      <div className="mx-3 mb-2 mt-1 space-y-px bg-black">
                        <JackSubItem to="/venues/search">Find Venues</JackSubItem>
                        <JackSubItem to="/venues/featured">Featured Venues</JackSubItem>
                        {canManageVenues && (
                          <>
                            <JackSubItem to="/venues/list-venue">List Your Venue</JackSubItem>
                            <JackSubItem to="/venues/manage">Manage Venues</JackSubItem>
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
                      <div className="mx-3 mb-2 mt-1 space-y-px bg-black">
                        <JackSubItem to="/tournaments">Browse Tournaments</JackSubItem>
                        {canManageTournaments && (
                          <>
                            <JackSubItem to="/organizer/tournaments">Manage Tournaments</JackSubItem>
                            <JackSubItem to="/tournaments/create">Create Tournament</JackSubItem>
                            <JackSubItem to="/organizer/seasons">Manage Seasons</JackSubItem>
                            <JackSubItem to="/tournaments/create?mode=season">Create Season</JackSubItem>
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
                      <div className="mx-3 mb-2 mt-1 space-y-px bg-black">
                        <JackSubItem to="/about/company">About Us</JackSubItem>
                        <JackSubItem to="/about/contact">Contact</JackSubItem>
                        <JackSubItem to="/about/faq">FAQ</JackSubItem>
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
              <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                <Link
                  to="/auth/signin"
                  className="flex-1 border border-white/10 px-4 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-white/85 transition-colors hover:border-white/30 hover:text-white"
                  onClick={onClose}
                >
                  Log in
                </Link>
                <Link
                  to="/auth/signup"
                  className="group relative flex-1 overflow-hidden bg-white px-4 py-2.5 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-black"
                  onClick={onClose}
                >
                  <span className="relative z-10">Sign up</span>
                  <span className="absolute inset-0 z-0 translate-y-full bg-rose-500 transition-transform duration-300 group-hover:translate-y-0" />
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
