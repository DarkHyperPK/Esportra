'use client';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = (location.state as { email?: string })?.email ?? '';
    const { toast } = useToast();
    const [resending, setResending] = useState(false);
    const [verified, setVerified] = useState(false);

    useEffect(() => {
        let redirectTimer: ReturnType<typeof setTimeout> | undefined;

        const confirmVerification = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email_confirmed_at && !verified) {
                setVerified(true);
                toast({
                    title: 'Email verified!',
                    description: 'Welcome to Esportra. Redirecting...',
                    duration: 3000,
                });
                redirectTimer = setTimeout(() => navigate('/'), 1500);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                void confirmVerification();
            }
        });
        return () => {
            subscription.unsubscribe();
            if (redirectTimer) clearTimeout(redirectTimer);
        };
    }, [navigate, toast, verified]);

    // Also poll for verification in case the auth event was missed
    useEffect(() => {
        if (!email || verified) return;
        const interval = setInterval(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email_confirmed_at) {
                setVerified(true);
                toast({
                    title: 'Email verified!',
                    description: 'Welcome to Esportra. Redirecting...',
                    duration: 3000,
                });
                clearInterval(interval);
                setTimeout(() => navigate('/'), 1500);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [email, verified, navigate, toast]);

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });
            if (error) throw error;
            toast({
                title: 'Email sent',
                description: 'A new confirmation link has been sent.',
                duration: 5000,
            });
        } catch {
            toast({
                title: 'Failed to resend',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        } finally {
            setResending(false);
        }
    };

    return (
        <AuthLayout
            title="Verify your email"
            subtitle="One last step before you're in"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
            >
                {verified ? (
                    <>
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Email verified!</h2>
                        <p className="text-white/60 mb-4">Redirecting you to Esportra...</p>
                        <Loader2 className="w-6 h-6 text-rose-500 animate-spin mx-auto" />
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
                            <Mail className="w-10 h-10 text-rose-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                        <p className="text-white/60 mb-4 max-w-xs mx-auto text-balance">
                            We've sent a confirmation link to{' '}
                            {email ? (
                                <span className="text-white font-medium">{email}</span>
                            ) : (
                                'your email'
                            )}
                            . Click the link to activate your account.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-white/30 text-sm mb-8">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Waiting for verification...
                        </div>
                        <p className="text-sm text-white/40">
                            Didn't receive the email? Check your spam folder or{' '}
                            <button
                                onClick={handleResend}
                                disabled={resending || !email}
                                className="text-rose-500 hover:underline disabled:opacity-50"
                            >
                                {resending ? 'Sending...' : 'resend it'}
                            </button>
                        </p>
                        <div className="mt-4">
                            <Link
                                to="/auth/signin"
                                className="inline-flex items-center text-sm text-rose-500 hover:text-rose-400 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Sign In
                            </Link>
                        </div>
                    </>
                )}
            </motion.div>
        </AuthLayout>
    );
};

export default VerifyEmail;
