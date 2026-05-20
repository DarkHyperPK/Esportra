import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { JackButton } from "@/components/ui/JackButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-4 text-white">
      <div className="w-full max-w-lg border border-white/10 bg-[#0a0a0c]/90 p-8">
        <h1 className="mb-4 font-heading text-5xl font-black uppercase tracking-tight text-white">404</h1>
        <p className="mb-6 text-xl text-zinc-400">Oops! Page not found</p>
        <JackButton as={Link} to="/">
          Return to Home
        </JackButton>
      </div>
    </div>
  );
};

export default NotFound;
