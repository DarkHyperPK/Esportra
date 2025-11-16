
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ProfileLoading } from "@/components/profile/ProfileLoading";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const SignUp = () => {
  const { signUp, loading, user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [isAlreadySignedIn, setIsAlreadySignedIn] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      username: "",
      fullName: "",
      password: "",
    },
  });

  // Check if user is already signed in
  useEffect(() => {
    if (user && profile) {
      setIsAlreadySignedIn(true);
      toast({
        title: "Already signed in",
        description: `You are already signed in as ${profile.username || profile.full_name || user.email}`,
      });
      // Redirect to appropriate dashboard after a short delay
      setTimeout(() => {
        navigate("/user/dashboard");
      }, 2000);
    }
  }, [user, profile, navigate, toast]);

  const onSubmit = async (values: FormValues) => {
    // Prevent form submission if already signed in
    if (isAlreadySignedIn) {
      toast({
        title: "Already signed in",
        description: "You are already signed in. Redirecting to dashboard...",
      });
      navigate("/user/dashboard");
      return;
    }

    try {
      setFormError(null);
      console.log("Form submitted with values:", values);
      
      await signUp(
        values.email,
        values.password,
        values.username,
        values.fullName,
        'casual'
      );
      
      toast({
        title: "Account created successfully!",
        description: "Welcome to Frag and Book! You are now logged in.",
      });
      
      // Navigate to appropriate dashboard based on role
      navigate("/user/dashboard");
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


  if (loading) {
    return <ProfileLoading />;
  }

  // Show already signed in message
  if (isAlreadySignedIn) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <div className="flex-grow container mx-auto flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="bg-gaming-dark p-8 rounded-lg border border-gaming-gray/30 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-4">Already Signed In</h1>
              <p className="text-gray-400 mb-6">
                You are already signed in as <strong>{profile?.username || profile?.full_name || user?.email}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Redirecting to dashboard...
              </p>
              <Button 
                onClick={() => navigate("/user/dashboard")}
                className="w-full bg-gaming-purple hover:bg-gaming-purple/80"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <div className="flex-grow container mx-auto flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-gaming-dark p-8 rounded-lg border border-gaming-gray/30">
            <h1 className="text-2xl font-bold mb-6 text-center">Create Your Account</h1>
            <p className="text-gray-400 text-center mb-6">
              Create your account to start playing and organizing tournaments.
            </p>
            
            {formError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Full Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                
                <Button 
                  type="submit" 
                  className="w-full bg-gaming-purple hover:bg-gaming-purple/80"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Sign Up"}
                </Button>
              </form>
            </Form>
            
            
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-400">Already have an account?</span>{" "}
              <Link to="/auth/signin" className="text-gaming-purple hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SignUp;
