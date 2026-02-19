import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [view, setView] = useState<'login' | 'reset'>('login');
    const [resetSent, setResetSent] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Redirect to dashboard explicitly
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const redirectUrl = import.meta.env.VITE_PARTNER_URL ? `${import.meta.env.VITE_PARTNER_URL}/set-password` : `${window.location.origin}/set-password`;
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl,
            });

            if (error) throw error;
            setResetSent(true);
        } catch (err: any) {
            setError(err.message);
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

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Brand Logo */}
                <div className="flex flex-col items-center mb-12">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(244,63,94,0.1)] border border-rose-500/20 backdrop-blur-md">
                        <img src="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/eSportra%20Logo/eSPORTRA%20white%20transparent.png" alt="Esportra" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
                        ESPORTRA<span className="text-rose-500">_PARTNER</span>
                    </h1>
                    <p className="text-[10px] font-mono text-zinc-500 tracking-[0.4em] uppercase mt-2">Protocol: Secure_Gateway</p>
                </div>

                <AnimatePresence mode="wait">
                    {view === 'reset' && resetSent ? (
                        <motion.div
                            key="reset-sent"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0a0a0c] border border-white/5 p-10 rounded-3xl backdrop-blur-xl text-center relative overflow-hidden group"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-black font-heading tracking-tight text-white mb-3">RECOVERY_INITIATED</h2>
                            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
                                Password reset protocol sent to <br />
                                <span className="text-white font-bold">{email}</span>. <br />
                                Check secure channels.
                            </p>
                            <button
                                onClick={() => { setView('login'); setResetSent(false); }}
                                className="text-xs font-mono text-zinc-600 hover:text-rose-500 transition-colors uppercase tracking-widest underline underline-offset-8"
                            >
                                Return_To_Login
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0a0a0c] border border-white/5 p-10 rounded-3xl backdrop-blur-xl relative"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />

                            <div className="mb-10">
                                <h2 className="text-xl font-bold text-white mb-1">
                                    {view === 'login' ? 'TERMINAL_LOGIN' : 'RESET_CREDENTIALS'}
                                </h2>
                                <p className="text-xs text-zinc-500 font-mono tracking-wider uppercase">Identity_Verification_Required</p>
                            </div>

                            <form onSubmit={view === 'login' ? handleLogin : handleResetPassword} className="space-y-6">
                                {error && (
                                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono rounded-xl animate-shake">
                                        SYSTEM_ERR: {error.toUpperCase()}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase ml-1">E-Mail_Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-rose-500 transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all font-mono"
                                            placeholder="USER@DOMAIN.COM"
                                        />
                                    </div>
                                </div>

                                {view === 'login' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase ml-1">Password</label>
                                            <button
                                                type="button"
                                                onClick={() => setView('reset')}
                                                className="text-[10px] font-mono text-zinc-600 hover:text-rose-500 transition-colors uppercase tracking-widest"
                                            >
                                                Forgot_Key?
                                            </button>
                                        </div>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-rose-500 transition-colors" />
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 transition-all font-mono"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(225,29,72,0.2)] flex items-center justify-center gap-3 group disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            {view === 'login' ? 'AUTHENTICATE' : 'SEND_RESET_LINK'}
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {view === 'reset' && (
                                <button
                                    onClick={() => setView('login')}
                                    className="mt-6 w-full text-center text-[10px] font-mono text-zinc-600 hover:text-rose-500 transition-colors uppercase tracking-widest"
                                >
                                    Return_To_Login
                                </button>
                            )}

                            <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
                                <span>Encrypted_Link</span>
                                <span>Ver_2.0.4.8</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Credits */}
                <div className="mt-12 text-center">
                    <p className="text-[10px] font-mono text-zinc-700 tracking-[0.2em] uppercase">
                        &copy; 2026 Esportra_Infrastructure_Nexus
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
