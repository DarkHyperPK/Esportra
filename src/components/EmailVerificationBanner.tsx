import { useState } from "react";
import { AlertTriangle, Mail, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const EmailVerificationBanner = () => {
  const { user, isEmailVerified, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  if (loading || !user || isEmailVerified || dismissed) return null;

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email!,
      });
      if (error) throw error;
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch {
      toast({ title: "Failed to resend", description: "Please try again later.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative z-50 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Your email is not verified. Some features are restricted.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
            {resending ? "Sending..." : "Resend email"}
          </button>
          <button
            onClick={() => navigate("/auth/verify-email")}
            className="text-xs font-medium text-amber-300 hover:text-amber-200 px-2 py-1.5 rounded-lg transition-colors"
          >
            Verify now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500/60 hover:text-amber-400 p-1 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
