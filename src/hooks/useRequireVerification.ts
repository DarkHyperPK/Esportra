import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Returns a guard function that blocks the action if the user's email is not verified.
 * Usage:
 *   const requireVerification = useRequireVerification();
 *   const handleJoin = () => {
 *     if (!requireVerification()) return;
 *     // ... proceed
 *   };
 */
export const useRequireVerification = () => {
  const { isEmailVerified, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  return (): boolean => {
    if (!user) return false;
    if (isEmailVerified) return true;
    toast({
      title: "Email verification required",
      description: "Please verify your email before using this feature.",
      variant: "destructive",
    });
    navigate("/auth/verify-email");
    return false;
  };
};
