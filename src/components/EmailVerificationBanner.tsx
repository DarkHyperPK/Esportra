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
    <div className="relative z-50 border-b border-amber-400/20 bg-amber-400/[0.06] px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Account not verified. Check your email or spam folder to verify your account.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleResend}
            disabled={resending}
            className="flex items-center gap-1.5 text-[13px] font-semibold text-black border border-transparent bg-white hover:bg-zinc-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
            {resending ? "Sending..." : "Resend email"}
          </button>
          <button
            onClick={() => navigate("/auth/verify-email")}
            className="text-[13px] font-semibold text-amber-200 hover:text-white px-2 py-1.5 transition-colors"
          >
            Verify now
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner;
