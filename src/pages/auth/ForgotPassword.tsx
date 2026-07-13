'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const handleSubmit = async (values: ForgotPasswordFormValues) => {
        setLoading(true);

        try {
            await supabase.auth.signOut({ scope: 'local' });
            await apiClient.post('/api/auth/recovery', { email: values.email, portal: 'main' });
        } catch {
            // Recovery requests deliberately use an identical response to prevent account enumeration.
        } finally {
            setSuccess(true);
            toast({
                title: 'Check your email',
                description: 'If an account exists for this address, a reset link will arrive shortly.',
            });
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Forgot Password"
            subtitle="Enter your email to receive a password reset link"
            variant="signin"
        >
            <AnimatePresence mode="wait">
                {!success ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                    >
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-white/70">Email Address</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="email"
                                                        placeholder="your@email.com"
                                                        className="h-12 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20 pl-12"
                                                        {...field}
                                                    />
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-red-400" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-rose-500 hover:bg-rose-600 transition-all text-white font-bold font-mono tracking-wider"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Sending Link...
                                        </>
                                    ) : (
                                        "Send Reset Link"
                                    )}
                                </Button>
                            </form>
                        </Form>

                        <div className="mt-8 text-center">
                            <Link
                                to="/auth/signin"
                                className="inline-flex items-center text-sm text-rose-500 hover:text-rose-400 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Sign In
                            </Link>
                        </div>
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
                        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                        <p className="text-white/60 mb-8 max-w-xs mx-auto text-balance">
                            If an account exists for this address, a password reset link will arrive shortly.
                        </p>
                        <Button
                            asChild
                            className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white"
                        >
                            <Link to="/auth/signin">
                                Return to Login
                            </Link>
                        </Button>
                        <p className="mt-6 text-sm text-white/40">
                            Didn't receive the email? Check your spam folder or{' '}
                            <button
                                onClick={() => setSuccess(false)}
                                className="text-rose-500 hover:underline"
                            >
                                try again
                            </button>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </AuthLayout>
    );
};

export default ForgotPassword;
