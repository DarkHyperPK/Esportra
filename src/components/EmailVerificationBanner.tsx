import { useState } from "react";
import { AlertTriangle, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const EmailVerificationBanner = () => {
  const { user, isEmailVerified, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [resending, setResending] = useState(false);

  if (loading || !user || isEmailVerified) return null;

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
    <div className="relative z-50 border-b border-rose-500/20 bg-rose-500/5 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-rose-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Account not verified. Check your email or spam folder to verify your account.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white border border-transparent bg-rose-500 hover:bg-rose-400 px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
            {resending ? "Sending..." : "Resend email"}
          </button>
          <button
            onClick={() => navigate("/auth/verify-email")}
            className="text-xs font-mono font-bold uppercase tracking-wider text-rose-300 hover:text-white px-2 py-1.5 transition-colors"
          >
            Verify now
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
