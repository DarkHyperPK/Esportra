'use client';

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';

const resetPasswordSchema = z.object({
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { toast } = useToast();

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    useEffect(() => {
        const verifyTokenAndSession = async () => {
            // Check if we arrived via a token_hash link (from our custom recovery email)
            const params = new URLSearchParams(window.location.search);
            const tokenHash = params.get('token_hash');
            const type = params.get('type');

            if (tokenHash && type === 'recovery') {
                // Verify the OTP token to establish a session
                const { error: otpError } = await supabase.auth.verifyOtp({
                    token_hash: tokenHash,
                    type: 'recovery',
                });

                if (otpError) {
                    console.error('Token verification failed:', otpError);
                    setError("Your reset link has expired or is invalid. Please request a new one.");
                    return;
                }

                // Clean the URL (remove query params) for a nicer UX
                window.history.replaceState({}, '', '/auth/reset-password');
                return; // Session is now established, form is ready
            }

            // Fallback: check if we already have a session (e.g. via hash fragment flow)
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Your reset session has expired or is invalid. Please request a new link.");
            }
        };
        verifyTokenAndSession();
    }, []);

    const handleSubmit = async (values: ResetPasswordFormValues) => {
        setLoading(true);
        setError(null);

        try {
            // Call .NET backend set-password (uses JWT session established by verifyOtp)
            const data = await apiClient.post('/api/auth/set-password', {
                password: values.password,
            });

            if (data?.error) throw new Error(data.error);

            setSuccess(true);
            toast({
                title: "Password updated!",
                description: "Your password has been reset successfully.",
            });

            // Wait a bit before redirecting
            setTimeout(() => {
                navigate('/auth/signin');
            }, 3000);
        } catch (err: any) {
            console.error("Reset password error:", err);
            setError(err.message);
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Reset Password"
            subtitle="Set a new secure password for your account"
            variant="signup"
        >
            <AnimatePresence mode="wait">
                {!success ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {error && (
                            <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white/70">New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20 pl-12 pr-12"
                                                        {...field}
                                                    />
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                                                    >
                                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white/70">Confirm New Password</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="••••••••"
                                                        className="h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20 pl-12"
                                                        {...field}
                                                    />
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={loading || !!error}
                                    className="w-full h-12 bg-rose-500 hover:bg-rose-600 transition-all text-white font-bold font-mono tracking-wider"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Updating Password...
                                        </>
                                    ) : (
                                        "Reset Password"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-8"
                    >
                        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                        <p className="text-white/60 mb-8 max-w-xs mx-auto">
                            Your password has been updated. You are being redirected to the sign-in page...
                        </p>
                        <div className="flex justify-center">
                            <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AuthLayout>
    );
};

export default ResetPassword;
