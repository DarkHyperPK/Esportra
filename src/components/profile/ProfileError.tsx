
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface ProfileErrorProps {
  message?: string;
  requiresAuth?: boolean;
}

export const ProfileError = ({ message, requiresAuth }: ProfileErrorProps) => {
  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8 flex justify-center items-center">
        <div className="text-center">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {requiresAuth ? "Please sign in to view your profile." : message || "Something went wrong loading the profile page."}
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link to={requiresAuth ? "/auth/signin" : "/"}>
              {requiresAuth ? "Sign In" : "Return to Home"}
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

