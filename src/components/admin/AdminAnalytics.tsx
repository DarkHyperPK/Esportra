
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart as BarChartIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

const COLORS = ['#FF6B6B', '#4ECDC4', '#FFD166', '#6A0572'];

type SystemStats = {
  total_users?: number;
  active_users?: number;
  total_tournaments?: number;
  active_tournaments?: number;
  total_venues?: number;
  total_prize_pool?: number;
};

const AdminAnalytics = () => {
  const [stats, setStats] = useState<SystemStats>({});
  const [popularGames, setPopularGames] = useState<{ name: string; count: number }[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<{ name: string; value: number }[]>([]);
  const [growthSeries, setGrowthSeries] = useState<{ name: string; users: number; venues: number; tournaments: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Stats via view or RPC
        let sys: SystemStats | null = null;
        const { data: viewData, error: viewErr } = await supabase
          .from('admin_dashboard_stats')
          .select('*')
          .maybeSingle();
        if (!viewErr && viewData) {
          sys = {
            total_users: viewData.total_users,
            active_users: viewData.active_users,
            total_tournaments: viewData.total_tournaments,
            active_tournaments: viewData.active_tournaments,
            total_venues: viewData.total_venues,
            total_prize_pool: viewData.total_prize_pool,
          };
        } else {
          const { data: rpcData } = await supabase.rpc('get_system_stats');
          if (rpcData) sys = rpcData as SystemStats;
        }
        if (sys) setStats(sys);

        // Popular games from tournaments
        const { data: tournaments } = await supabase
          .from('tournaments')
          .select('game');
        if (tournaments) {
          const map = new Map<string, number>();
          tournaments.forEach(t => {
            const g = (t.game || 'Unknown').toString().trim();
            map.set(g, (map.get(g) || 0) + 1);
          });
          const sorted = Array.from(map.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
          setPopularGames(sorted);
        }

        // Role distribution from profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('role');
        if (profiles) {
          const map = new Map<string, number>();
          profiles.forEach(p => {
            const r = (p.role || 'casual').toString();
            map.set(r, (map.get(r) || 0) + 1);
          });
          setRoleDistribution(Array.from(map.entries()).map(([name, value]) => ({ name, value })));
        }

        // Growth over last 6 months by created_at
        const [usersCreated, venues, tourneys] = await Promise.all([
          supabase.from('profiles').select('created_at'),
          supabase.from('venues').select('created_at'),
          supabase.from('tournaments').select('created_at'),
        ]);
        const months = [...Array(6)].map((_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        });
        const countByMonth = (rows?: { created_at: string }[]) => {
          const map = new Map<string, number>(months.map(m => [m, 0]));
          (rows || []).forEach(r => {
            const d = new Date(r.created_at);
            const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
          });
          return months.map(m => map.get(m) || 0);
        };
        const u = countByMonth((usersCreated?.data as any) || []);
        const v = countByMonth((venues?.data as any) || []);
        const t = countByMonth((tourneys?.data as any) || []);
        setGrowthSeries(months.map((m, idx) => ({ name: m, users: u[idx], venues: v[idx], tournaments: t[idx] })));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pieData = useMemo(() => roleDistribution, [roleDistribution]);
  const barData = useMemo(() => popularGames, [popularGames]);
  const lineData = useMemo(() => growthSeries, [growthSeries]);

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <BarChartIcon className="w-5 h-5 text-blue-400" />
          Analytics Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4 text-white">Growth Over Time</h3>
            <div className="h-72 bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
                  <Legend />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="venues" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="tournaments" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Popular Games temporarily removed */}
          
          <div>
            <h3 className="text-lg font-medium mb-4 text-white">User Distribution</h3>
            <div className="h-72 bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#222', borderColor: '#444' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4 text-white">Platform Statistics</h3>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Total Users</span>
                  <span className="font-bold text-white">{loading ? '...' : stats.total_users ?? 0}</span>
                </div>
                <div className="w-full h-2 bg-gray-600/30 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: '100%' }}></div>
                </div>
                <div className="text-xs mt-1 text-gray-400">Active: {stats.active_users ?? 0}</div>
              </div>
              
              <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Tournaments</span>
                  <span className="font-bold text-white">{loading ? '...' : stats.total_tournaments ?? 0}</span>
                </div>
                <div className="w-full h-2 bg-gray-600/30 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '100%' }}></div>
                </div>
                <div className="text-xs mt-1 text-gray-400">Active: {stats.active_tournaments ?? 0}</div>
              </div>
              
              <div className="p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300">Venues</span>
                  <span className="font-bold text-white">{loading ? '...' : stats.total_venues ?? 0}</span>
                </div>
                <div className="w-full h-2 bg-gray-600/30 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full" style={{ width: '100%' }}></div>
                </div>
                <div className="text-xs mt-1 text-gray-400">Prize Pool: ${Number(stats.total_prize_pool || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAnalytics;
