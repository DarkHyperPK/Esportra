import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { ShieldAlert, Mail, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const SuspendedPage = () => {
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const state = location.state as any || {};

    // Get values from router state first (if navigated here after sign-in), then fallback to profile, then defaults
    const rawSuspensionUntil = state.until || profile?.suspension_until;
    const suspensionUntil = rawSuspensionUntil ? new Date(rawSuspensionUntil) : null;
    const isPermanent = !rawSuspensionUntil;
    const reason = state.reason || profile?.suspension_reason || "Violation of platform terms of service.";
    const type = state.type || profile?.suspension_type || "Standard Suspension";

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full"
            >
                <div className="relative p-8 bg-[#0a0a0c]/90 border border-red-500/20 overflow-hidden">
                    {/* Decorative Background Glow */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/20 rounded-full blur-[100px]" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-[100px]" />

                    <div className="relative text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 border border-red-500/20 mb-6 group">
                            <ShieldAlert className="w-10 h-10 text-red-500 group-hover:scale-110 transition-transform duration-300" />
                        </div>

                        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Account Suspended</h1>
                        <p className="text-zinc-400 mb-8 px-4">
                            Your account access has been restricted due to a policy violation.
                        </p>

                        <div className="space-y-4 text-left mb-8">
                            <div className="p-4 bg-[#0a0a0c] border border-white/10">
                                <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Reason</p>
                                <p className="text-zinc-200 text-sm leading-relaxed">{reason}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-[#0a0a0c] border border-white/10">
                                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Type</p>
                                    <p className="text-red-400 text-sm font-medium">{type}</p>
                                </div>
                                <div className="p-4 bg-[#0a0a0c] border border-white/10 flex flex-col justify-center">
                                    <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Duration
                                    </p>
                                    <p className="text-zinc-200 text-sm font-medium">
                                        {isPermanent ? "Permanent" : formatDistanceToNow(suspensionUntil!!)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <a
                                href="mailto:operations@esportra.com"
                                className="inline-flex items-center justify-center gap-2 w-full p-4 border border-white/10 bg-[#0a0a0c] hover:bg-white/5 text-white transition-all duration-200 group"
                            >
                                <Mail className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                                <span>Contact operations@esportra.com</span>
                            </a>

                            <Button
                                variant="ghost"
                                onClick={signOut}
                                className="text-zinc-500 hover:text-red-400 hover:bg-red-500/5 h-12"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                        </div>
                    </div>
                </div>

                <p className="text-center mt-8 text-zinc-600 text-xs">
                    Case ID: {profile?.id?.slice(0, 8).toUpperCase()} • Esportra Safety & Compliance
                </p>
            </motion.div>
        </div>
    );
};

export default SuspendedPage;
