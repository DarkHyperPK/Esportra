import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const SetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        const checkParams = () => {
            const params = new URLSearchParams(window.location.search);
            const tokenHash = params.get('token_hash');
            const type = params.get('type');

            if (!tokenHash && !type) {
                // If no token in URL, check for existing session as fallback
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!session) {
                        setError("No active session or valid invite link detected. Please use the link from your email.");
                    }
                });
            }
            setVerifying(false);
        };
        checkParams();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const params = new URLSearchParams(window.location.search);
            const token_hash = params.get('token_hash');
            const type = params.get('type');

            // Pass token_hash and type directly to the Edge Function for server-side verification
            const { data, error } = await supabase.functions.invoke('set-password', {
                body: {
                    password,
                    token_hash,
                    type: type || 'recovery' // Default to recovery for reset links
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            console.log('Password updated successfully for:', data?.email);

            // Redirect to login with success message as requested for "manual login" flow
            navigate('/login?success=password_updated');
        } catch (err: any) {
            console.error('Password update error:', err);
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
                <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-rose-600/10 blur-[150px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-600/5 blur-[150px] rounded-full mix-blend-screen" />
            </div>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-rose-500/10 rounded-2xl border border-white/5 flex items-center justify-center mx-auto mb-6 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 group animate-float">
                        <ShieldCheck className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Set Your Password</h2>
                    <p className="text-zinc-400 text-sm">Create a secure password for your account</p>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#0a0a0c] border border-white/5 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                    <form onSubmit={handleUpdatePassword} className="space-y-5 relative">
                        {verifying ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
                                <p className="text-zinc-400 text-sm">Verifying your invite link...</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400 ml-1 uppercase tracking-wider">New Password</label>
                                    <div className="relative group/input">
                                        <Lock className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-[#121214] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-inner"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-zinc-400 ml-1 uppercase tracking-wider">Confirm Password</label>
                                    <div className="relative group/input">
                                        <Lock className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500 group-focus-within/input:text-indigo-400 transition-colors" />
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-[#121214] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-inner"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 text-center animate-in fade-in slide-in-from-top-2">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !password}
                                    className="w-full bg-white text-black font-semibold h-12 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 group/btn shadow-lg shadow-white/5"
                                >
                                    {loading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            Set Password
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </>
                        )}
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default SetPassword;
