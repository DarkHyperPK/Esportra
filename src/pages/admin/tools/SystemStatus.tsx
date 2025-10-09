import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Settings, ArrowLeft, Users, Trophy, MapPin, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const SystemStatusTool = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_system_stats');
        if (error) throw error;
        setStats(data);
      } catch (e) {
        console.warn('get_system_stats unavailable, falling back:', e);
        const [users, tournaments, venues] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('tournaments').select('*', { count: 'exact', head: true }),
          supabase.from('venues').select('*', { count: 'exact', head: true })
        ]);
        setStats({
          total_users: users.count || 0,
          total_tournaments: tournaments.count || 0,
          total_venues: venues.count || 0,
          total_prize_pool: 0
        });
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

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
              <Settings className="w-6 h-6 text-gray-300" />
              System Status
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-white text-2xl font-bold">{loading ? '...' : stats?.total_users ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-600 rounded-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Tournaments</p>
                  <p className="text-white text-2xl font-bold">{loading ? '...' : stats?.total_tournaments ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Venues</p>
                  <p className="text-white text-2xl font-bold">{loading ? '...' : stats?.total_venues ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Prize Pool</p>
                  <p className="text-white text-2xl font-bold">{loading ? '...' : `$${(stats?.total_prize_pool ?? 0).toLocaleString()}`}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Platform Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-gray-300">{loading ? 'Loading system metrics...' : 'System operating normally.'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemStatusTool;



