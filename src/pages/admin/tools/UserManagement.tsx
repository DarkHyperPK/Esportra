import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminUserManagement from "@/components/admin/UserManagement";

const UserManagementTool = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            User Management
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <AdminUserManagement />
      </div>
    </div>
  );
};

export default UserManagementTool;
