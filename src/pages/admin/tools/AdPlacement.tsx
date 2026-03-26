import { motion } from "framer-motion";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import AdPlacementDashboard from "@/components/admin/AdPlacementDashboard";

const AdPlacementTool = () => {
  return (
    <div className="min-h-screen p-4 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back nav */}
        <Link
          to="/admin/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <AdPlacementDashboard />
      </motion.div>
    </div>
  );
};

export default AdPlacementTool;
