import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminVenuesList from "@/components/admin/AdminVenuesList";
import { MapPin, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const VenueManagementTool = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MapPin className="w-6 h-6 text-green-400" />
              Venue Management
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Venues</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-6">
              <AdminVenuesList />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VenueManagementTool;



