
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const Unauthorized = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleRedirect = () => {
    navigate("/");  // Default to home page
  };

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <main className="flex-grow container mx-auto px-4 py-16 flex flex-col items-center justify-center">
        <div className="bg-[#0a0a0c] p-8 rounded-lg border border-white/10/30 max-w-lg w-full text-center">
          <ShieldAlert className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don't have permission to access this page. Please contact an administrator
            if you believe this is a mistake.
          </p>
          
          <Button 
            onClick={handleRedirect} 
            className="bg-gaming-purple hover:bg-gaming-purple/80"
          >
            Go to Home
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Unauthorized;

