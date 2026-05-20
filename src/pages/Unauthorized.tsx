
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { JackButton } from "@/components/ui/JackButton";
import { ShieldAlert } from "lucide-react";

const Unauthorized = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate("/");  // Default to home page
  };

  return (
    <div className="flex min-h-screen flex-col bg-transparent text-white">
      <main className="container mx-auto flex flex-grow flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg border border-white/10 bg-[#0a0a0c]/90 p-8">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="mb-2 font-heading text-3xl font-black uppercase tracking-tight text-white">Access Denied</h1>
          <p className="mb-6 text-zinc-400">
            You don't have permission to access this page. Please contact an administrator
            if you believe this is a mistake.
          </p>
          
          <JackButton onClick={handleRedirect}>
            Go to Home
          </JackButton>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Unauthorized;

