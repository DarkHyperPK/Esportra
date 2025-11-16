
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { Separator } from '@/components/ui/separator';
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
import { AlertCircle, Info, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define form schema with validation
const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

const SignIn = () => {
  const [error, setError] = useState<string | null>(null);
  const { signIn, loading: authLoading, user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAlreadySignedIn, setIsAlreadySignedIn] = useState(false);

  // Initialize form
  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
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

  const handleSubmit = async (values: SignInFormValues) => {
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
      setError(null);
      await signIn(values.email, values.password);
      toast({
        title: "Success!",
        description: "You have successfully signed in.",
      });
      navigate('/user/dashboard');
    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Show already signed in message
  if (isAlreadySignedIn) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="max-w-md w-full">
            <div className="card-esports spacing-card text-center">
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
                className="w-full bg-esports-primary hover:bg-esports-primary/80"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-esports-primary mb-2">Welcome Back</h1>
            <p className="text-esports-secondary">Sign in to your esports account</p>
          </div>
          <div className="card-esports spacing-card">

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
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
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full bg-gaming-purple hover:bg-gaming-purple/80"
                  disabled={authLoading}
                >
                  {authLoading ? 'Signing in...' : 'Sign In'}
                </Button>
                
                <div className="text-center mt-4 text-gray-400">
                  Don't have an account? <Link to="/auth/signup" className="text-gaming-purple hover:underline">Sign Up</Link>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SignIn;
