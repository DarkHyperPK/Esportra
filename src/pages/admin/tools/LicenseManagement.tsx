import { Button } from "@/components/ui/button";
import LicenseManagement from "@/components/admin/LicenseManagement";
import { Award, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LicenseManagementTool = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-purple-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">License Management</h1>
        </div>
      </div>

      <LicenseManagement />
    </div>
  );
};

export default LicenseManagementTool;
