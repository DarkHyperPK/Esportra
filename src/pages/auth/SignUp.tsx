'use client';

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button, AccentButton } from "@/components/ui/button";
import { AlertCircle, Eye, EyeOff, Loader2, CheckCircle, ArrowRight, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import AuthLayout from "@/components/auth/AuthLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { CountryCombobox } from "@/components/profile/CountryCombobox";
import { validateCountryCode } from "@/utils/countryValidation";
import { validateDateOfBirth } from "@/utils/dobValidation";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }).regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores.",
  }),
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  dateOfBirth: z.string().superRefine((val, ctx) => {
    const result = validateDateOfBirth(val);
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error ?? "Invalid date of birth." });
    }
  }),
  countryCode: z.string().superRefine((val, ctx) => {
    const result = validateCountryCode(val);
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error ?? "Invalid country." });
    }
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

// Password strength checker
const getPasswordStrength = (password: string) => {
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  strength = Object.values(checks).filter(Boolean).length;

  return { strength, checks };
};

const SignUp = () => {
  const { signUp, signInWithGoogle, signInWithDiscord, loading, user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [isAlreadySignedIn, setIsAlreadySignedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      username: "",
      fullName: "",
      dateOfBirth: "",
      countryCode: "",
      password: "",
      acceptTerms: false,
    },
  });

  const { strength, checks } = getPasswordStrength(passwordValue);

  // Check if user is already signed in
  useEffect(() => {
    if (user && profile) {
      setIsAlreadySignedIn(true);
      toast({
        title: "Already signed in",
        description: `You are already signed in as ${profile.username || profile.full_name || user.email}`,
      });
      setTimeout(() => {
        navigate("/");
      }, 2000);
    }
  }, [user, profile, navigate, toast]);

  const onSubmit = async (values: FormValues) => {
    if (isAlreadySignedIn) {
      navigate("/");
      return;
    }

    try {
      setFormError(null);
      await signUp(
        values.email,
        values.password,
        values.username,
        values.fullName,
        'casual',
        values.dateOfBirth,
        values.countryCode,
      );
      // Toast and navigation are handled by useAuthActions.signUp
    } catch (error: any) {
      console.error("Signup error:", error);
      setFormError(error.message || "An error occurred during signup.");
      toast({
        title: "Signup failed",
        description: error.message || "An error occurred during signup.",
        variant: "destructive",
      });
    }
  };

  // Show already signed in message
  if (isAlreadySignedIn) {
    return (
      <AuthLayout title="Already Signed In" subtitle="Redirecting you to the dashboard..." variant="signup">
        <motion.div
          className="text-center py-8"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Welcome back!</h2>
          <p className="text-white/50 mb-6">
            Signed in as <span className="text-white font-medium">{profile?.username || user?.email}</span>
          </p>
          <Button
            onClick={() => navigate("/")}
            className="w-full bg-rose-500 hover:bg-rose-600 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join the competitive gaming community" variant="signup">
      {formError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert variant="destructive" className="mb-6 bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        </motion.div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/70">Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your email"
                    className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/70">Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Choose a username"
                    className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/70">Full Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your full name"
                    className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/70">Date of Birth</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20 [color-scheme:dark]"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countryCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/70">Country</FormLabel>
                <FormControl>
                  <CountryCombobox
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select your country"
                  />
                </FormControl>
                <FormMessage className="text-red-400" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/70">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className="h-11 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-rose-500 focus:ring-rose-500/20 pr-12"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        setPasswordValue(e.target.value);
                      }}
                    />
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

                {/* Password Strength Indicator */}
                {passwordValue && (
                  <motion.div
                    initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                    animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'grid', overflow: 'hidden' }}
                    className="mt-3"
                  >
                  <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-2">
                    {/* Strength Bar */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${strength >= level
                            ? strength <= 2 ? 'bg-red-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                            : 'bg-white/10'
                            }`}
                        />
                      ))}
                    </div>

                    {/* Requirements */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {[
                        { key: 'length', label: '8+ characters' },
                        { key: 'uppercase', label: 'Uppercase' },
                        { key: 'lowercase', label: 'Lowercase' },
                        { key: 'number', label: 'Number' },
                      ].map((req) => (
                        <div
                          key={req.key}
                          className={`flex items-center gap-1 ${checks[req.key as keyof typeof checks] ? 'text-green-400' : 'text-white/30'}`}
                        >
                          {checks[req.key as keyof typeof checks] ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {req.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  </motion.div>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="border-zinc-700 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm text-white/60 font-normal">
                    I agree to the{" "}
                    <Link to="/terms" className="text-rose-500 hover:underline">Terms of Service</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-rose-500 hover:underline">Privacy Policy</Link>
                  </FormLabel>
                  <FormMessage className="text-red-400" />
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-rose-500 hover:bg-rose-600 transition-all text-white font-bold font-mono tracking-wider mt-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#0a0a0c] text-white/40">or</span>
        </div>
      </div>

      {/* Social Login Buttons (Visual Only) */}
      <div className="grid grid-cols-2 gap-3">
        <AccentButton
          type="button"
          className="h-11 border-none"
          onClick={() => signInWithGoogle()}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </AccentButton>
        <Button
          type="button"
          className="h-11 bg-[#5865F2] hover:bg-[#4752C4] text-white border-none"
          onClick={() => signInWithDiscord()}
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1892.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.1023.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
          </svg>
          Discord
        </Button>
      </div>

      {/* Sign In Link */}
      <div className="mt-6 text-center">
        <span className="text-white/50">Already have an account? </span>
        <Link
          to="/auth/signin"
          className="text-rose-500 hover:text-rose-400 font-medium transition-colors"
        >
          Sign In
        </Link>
      </div>
    </AuthLayout>
  );
};

export default SignUp;
