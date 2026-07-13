'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
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
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '@/components/auth/AuthLayout';
import { usePasswordRecovery } from '@/hooks/usePasswordRecovery';
import { passwordConfirmationSchema } from '@/schemas/password';

type ResetPasswordFormValues = z.infer<typeof passwordConfirmationSchema>;

const ResetPassword = () => {
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const recovery = usePasswordRecovery();

    const form = useForm<ResetPasswordFormValues>({
        resolver: zodResolver(passwordConfirmationSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    });

    const handleSubmit = async (values: ResetPasswordFormValues) => {
        setLoading(true);
        const wasUpdated = await recovery.updatePassword(values.password);
        if (wasUpdated) {
            setSuccess(true);
            toast({
                title: "Password updated!",
                description: "Your password has been reset. Please sign in with your new password.",
            });

            setTimeout(() => {
                navigate('/auth/signin');
            }, 3000);
        } else {
            toast({
                title: "Error",
                description: recovery.message || 'Could not update your password.',
                variant: "destructive",
            });
        }
        setLoading(false);
    };

    const handleCancel = async () => {
        await recovery.cancelRecovery();
        navigate('/auth/signin', { replace: true });
    };

    const isChecking = recovery.status === 'checking-session';
    const canResetPassword = recovery.status === 'ready' || recovery.status === 'updating-password';

    return (
        <AuthLayout
            title="Reset Password"
            subtitle="Set a new secure password for your account"
            variant="signup"
        >
            <AnimatePresence mode="wait">
                {!success && isChecking ? (
                    <div className="flex items-center justify-center gap-3 py-12 text-zinc-400">
                        <Loader2 className="h-5 w-5 animate-spin text-rose-500" />
                        Verifying recovery link...
                    </div>
                ) : !success && canResetPassword ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {recovery.message && (
                            <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{recovery.message}</AlertDescription>
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
                                    disabled={loading || recovery.status !== 'ready'}
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
                ) : success ? (
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
                            Your password has been updated. Please sign in with your new password...
                        </p>
                        <div className="flex justify-center">
                            <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
                        </div>
                    </motion.div>
                ) : (
                    <div className="space-y-5 py-4">
                        <Alert variant="destructive" className="bg-red-500/10 border-red-500/30">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {recovery.message || 'This recovery link cannot be used.'}
                            </AlertDescription>
                        </Alert>
                        <Button type="button" variant="outline" onClick={handleCancel} className="h-12 w-full">
                            Return to sign in
                        </Button>
                    </div>
                )}
            </AnimatePresence>
        </AuthLayout>
    );
};

export default ResetPassword;
