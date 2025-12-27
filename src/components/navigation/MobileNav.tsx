import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useNotifications } from "@/components/NotificationContext";
import { UserRole } from "@/types/auth";
import RoleSwitcher from "@/components/RoleSwitcher";

import { motion, AnimatePresence } from "framer-motion";

const MobileNav = ({
  isOpen,
  onClose,
  handleSignOut
}: {
  isOpen: boolean;
  onClose: () => void;
  handleSignOut: () => Promise<void>;
}) => {
  const { user, profile } = useAuth();
  const { currentRole } = useRole();
  const { unreadCount } = useNotifications();
  const userRole = currentRole as UserRole;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="md:hidden relative z-50 border-t border-white/10 bg-gradient-to-b from-[#080a12]/95 via-[#05060b]/90 to-[#030307]/90 backdrop-blur-2xl shadow-[0_25px_45px_rgba(0,0,0,0.65)] overflow-visible"
        >
          <div className="space-y-1 px-3 pt-4 pb-4">
            {/* General Navigation */}
            <motion.div
              className="mb-3 space-y-1"
              initial="closed"
              animate="open"
              variants={{
                open: {
                  transition: { staggerChildren: 0.05 }
                }
              }}
            >
              {[
                { to: "/", label: "Home" },
                { to: "/venues/search", label: "Venues" },
                { to: "/tournaments/upcoming", label: "Tournaments" },
                { to: "/about/company", label: "About" },
                { to: "/app", label: "Download App" }
              ].map((item, index) => (
                <motion.div
                  key={item.to}
                  variants={{
                    closed: { x: -20, opacity: 0 },
                    open: { x: 0, opacity: 1 }
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Link
                    to={item.to}
                    className="block rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white"
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {user && (
              <>
                <div className="my-3 border-t border-white/10"></div>

                {/* Role & Identity Switchers */}
                {userRole !== 'admin' && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <RoleSwitcher />
                  </div>

                )}

                <div className="my-3 border-t border-white/10"></div>

                {/* User Navigation */}
                <div className="mb-3 space-y-1">
                  <Link to="/user/dashboard" className="block rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white" onClick={onClose}>
                    My Dashboard
                  </Link>
                  <Link to="/notifications" className="block rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white" onClick={onClose}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                      </div>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link to="/player/teams" className="block rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white" onClick={onClose}>
                    Create Your Team
                  </Link>
                  <Link to="/auth/profile" className="block rounded-2xl border border-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white" onClick={onClose}>
                    My Profile
                  </Link>
                </div>

                {/* Role-Specific Navigation */}
                {profile?.role === 'admin' && (
                  <div className="mb-3 space-y-1">
                    <Link to="/admin/dashboard" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      Admin Panel
                    </Link>
                  </div>
                )}
                {userRole === 'venue_owner' && (
                  <div className="mb-3 space-y-1">
                    <Link to="/venues/list-venue" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      My Venues
                    </Link>
                  </div>
                )}
                {userRole === 'organizer' && (
                  <div className="mb-3 space-y-1">
                    <Link to="/organizer/tournaments" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      Manage Tournaments
                    </Link>
                    <Link to="/tournaments/create" className="block rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/10" onClick={onClose}>
                      Create Tournament
                    </Link>
                  </div>
                )}

                <div className="my-3 border-t border-white/10"></div>

                {/* Sign Out */}
                <button
                  className="block w-full rounded-2xl border border-red-500/40 px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.15em] text-red-300 transition-all duration-200 hover:bg-red-500/10"
                  onClick={() => { onClose(); handleSignOut(); }}
                >
                  Sign Out
                </button>
              </>
            )}

            {!user && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                <Link to="/auth/signin" className="block rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.15em] text-white/70 transition-all duration-200 hover:border-white/20 hover:bg-white/5 hover:text-white" onClick={onClose}>
                  Sign In
                </Link>
                <Link to="/auth/signup" className="block rounded-2xl bg-gradient-to-r from-[#f43f5e] to-[#fb7185] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.15em] text-white shadow-[0_20px_45px_rgba(244,63,94,0.35)] transition-all duration-200 hover:from-[#fb7185] hover:to-[#f43f5e]" onClick={onClose}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )
      }
    </AnimatePresence >
  );
};

export default MobileNav;
