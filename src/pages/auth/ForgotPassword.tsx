'use client';

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
import { AlertCircle, Loader2, CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const form = useForm<ForgotPasswordFormValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    });

    const handleSubmit = async (values: ForgotPasswordFormValues) => {
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.resetPasswordForEmail(
                values.email,
                { redirectTo: `${window.location.origin}/auth/callback` }
            );

            if (authError) throw authError;

            setSuccess(true);
            toast({
                title: "Reset link sent!",
                description: "Please check your email for the password reset link.",
            });
        } catch (err: any) {
            console.error("Forgot password error:", err);
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
                            We've sent a password reset link to <span className="text-white font-medium">{form.getValues('email')}</span>.
                            The link will expire in 1 hour.
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
