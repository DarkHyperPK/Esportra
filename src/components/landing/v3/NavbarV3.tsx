import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";
import { Menu, X } from "lucide-react";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import UserMenu from "@/components/navigation/UserMenu";
import RoleSwitcher from "@/components/RoleSwitcher";

const NavbarV3 = () => {
    const { user, profile, signOut } = useAuth();
    const { currentRole } = useRole();
    const admin = useAdmin();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const isSuperAdmin = admin.isAdmin && admin.roles.includes('super_admin');
    const userRole = currentRole;

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 30);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/auth/signin');
        } catch {
            toast({ title: "Error signing out", description: "Please try again", variant: "destructive" });
        }
    };

    return (
        <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 left-0 right-0 z-[999]"
        >
            {/* Thin rose accent line at very top */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-60" />

            <div
                className={`transition-all duration-700 ${
                    isScrolled
                        ? "bg-black/80 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
                        : "bg-transparent"
                }`}
            >
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="flex items-center justify-between h-[72px]">
                        {/* Logo */}
                        <Link to="/" className="flex-shrink-0 group">
                            <img
                                src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                                alt="Esportra"
                                className="h-8 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                        </Link>

                        {/* Desktop — Center Links */}
                        <nav className="hidden lg:flex items-center gap-0">
                            {[
                                { to: "/venues/search", label: "Venues" },
                                { to: "/tournaments/upcoming", label: "Tournaments" },
                                { to: "/leaderboards", label: "Leaderboards" },
                                { to: "/about/company", label: "About" },
                                { to: "/partners", label: "Partners" },
                            ].map((item) => (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    className="relative px-5 py-2 text-[13px] font-semibold text-white/50 hover:text-white tracking-[0.08em] uppercase transition-colors duration-300 group"
                                >
                                    {item.label}
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-rose-500 group-hover:w-3/4 transition-all duration-300" />
                                </Link>
                            ))}
                        </nav>

                        {/* Desktop — Right */}
                        <div className="hidden lg:flex items-center gap-4">
                            {user ? (
                                <>
                                    <NotificationDropdown />
                                    <UserMenu handleSignOut={handleSignOut} />
                                </>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Link
                                        to="/auth/signin"
                                        className="text-[13px] font-semibold text-white/60 hover:text-white tracking-[0.06em] uppercase transition-colors"
                                    >
                                        Log In
                                    </Link>
                                    <Button
                                        asChild
                                        size="sm"
                                        className="bg-rose-500 hover:bg-rose-400 text-white text-[13px] font-bold tracking-[0.06em] uppercase px-6 h-9 rounded-md transition-all duration-300"
                                    >
                                        <Link to="/auth/signup">Sign Up</Link>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                            aria-label="Toggle menu"
                        >
                            <AnimatePresence mode="wait">
                                {mobileOpen ? (
                                    <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                                        <X className="w-6 h-6" />
                                    </motion.div>
                                ) : (
                                    <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                                        <Menu className="w-6 h-6" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="lg:hidden bg-black/95 backdrop-blur-2xl border-t border-white/5"
                    >
                        <div className="max-w-7xl mx-auto px-5 py-6 space-y-1">
                            {[
                                { to: "/venues/search", label: "Venues" },
                                { to: "/tournaments/upcoming", label: "Tournaments" },
                                { to: "/leaderboards", label: "Leaderboards" },
                                { to: "/about/company", label: "About" },
                                { to: "/partners", label: "Partners" },
                            ].map((item, i) => (
                                <motion.div
                                    key={item.to}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Link
                                        to={item.to}
                                        onClick={() => setMobileOpen(false)}
                                        className="block px-4 py-3 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors tracking-wide uppercase"
                                    >
                                        {item.label}
                                    </Link>
                                </motion.div>
                            ))}

                            {user ? (
                                <>
                                    <div className="h-px bg-white/10 my-4" />
                                    {userRole !== 'admin' && (
                                        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 mb-3">
                                            <RoleSwitcher />
                                        </div>
                                    )}
                                    <MobLink to="/user/profile" onClick={() => setMobileOpen(false)}>My Profile</MobLink>
                                    <MobLink to="/notifications" onClick={() => setMobileOpen(false)}>Notifications</MobLink>
                                    <MobLink to="/player/teams" onClick={() => setMobileOpen(false)}>My Teams</MobLink>

                                    {profile?.role === 'admin' && (
                                        <MobLink to="/admin/dashboard" onClick={() => setMobileOpen(false)} accent>Admin Panel</MobLink>
                                    )}
                                    {(userRole === 'venue_owner' || isSuperAdmin) && (
                                        <>
                                            <MobLink to="/venues/manage" onClick={() => setMobileOpen(false)}>Manage Venues</MobLink>
                                            <MobLink to="/venues/list-venue" onClick={() => setMobileOpen(false)}>List Venue</MobLink>
                                        </>
                                    )}
                                    {(userRole === 'organizer' || isSuperAdmin) && (
                                        <>
                                            <MobLink to="/organizer/tournaments" onClick={() => setMobileOpen(false)}>Manage Tournaments</MobLink>
                                            <MobLink to="/tournaments/create" onClick={() => setMobileOpen(false)}>Create Tournament</MobLink>
                                        </>
                                    )}
                                    <div className="h-px bg-white/10 my-4" />
                                    <button
                                        onClick={() => { setMobileOpen(false); handleSignOut(); }}
                                        className="w-full text-left px-4 py-3 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors tracking-wide uppercase"
                                    >
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="h-px bg-white/10 my-4" />
                                    <div className="flex gap-3 px-2">
                                        <Button asChild variant="outline" className="flex-1 border-white/15 text-white hover:bg-white/5 h-11 text-sm font-semibold tracking-wide uppercase">
                                            <Link to="/auth/signin" onClick={() => setMobileOpen(false)}>Log In</Link>
                                        </Button>
                                        <Button asChild className="flex-1 bg-rose-500 hover:bg-rose-400 text-white h-11 text-sm font-bold tracking-wide uppercase">
                                            <Link to="/auth/signup" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
};

const MobLink = ({ to, onClick, children, accent }: { to: string; onClick: () => void; children: React.ReactNode; accent?: boolean }) => (
    <Link
        to={to}
        onClick={onClick}
        className={`block px-4 py-3 text-sm font-semibold rounded-lg transition-colors tracking-wide uppercase ${
            accent ? "text-rose-400 hover:bg-rose-500/10" : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
    >
        {children}
    </Link>
);

export default NavbarV3;
