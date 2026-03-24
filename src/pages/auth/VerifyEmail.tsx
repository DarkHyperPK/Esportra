'use client';

import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const VerifyEmail = () => {
    const location = useLocation();
    const email = (location.state as { email?: string })?.email ?? '';
    const { toast } = useToast();
    const [resending, setResending] = useState(false);

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
                <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-6 border border-rose-500/30">
                    <Mail className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                <p className="text-white/60 mb-8 max-w-xs mx-auto text-balance">
                    We've sent a confirmation link to{' '}
                    {email ? (
                        <span className="text-white font-medium">{email}</span>
                    ) : (
                        'your email'
                    )}
                    . Click the link to activate your account.
                </p>
                <Button
                    asChild
                    className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white"
                >
                    <Link to="/auth/signin">
                        Go to Sign In
                    </Link>
                </Button>
                <p className="mt-6 text-sm text-white/40">
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
            </motion.div>
        </AuthLayout>
    );
};

export default VerifyEmail;
