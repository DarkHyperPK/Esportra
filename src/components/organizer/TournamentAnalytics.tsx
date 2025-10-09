
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const participantData = [
  { name: 'Jan', participants: 65 },
  { name: 'Feb', participants: 80 },
  { name: 'Mar', participants: 95 },
  { name: 'Apr', participants: 120 },
  { name: 'May', participants: 75 },
  { name: 'Jun', participants: 105 }
];

const gameData = [
  { name: 'Valorant', value: 45 },
  { name: 'League of Legends', value: 30 },
  { name: 'CS:GO', value: 15 },
  { name: 'Fortnite', value: 10 },
  { name: 'Other', value: 5 }
];

const COLORS = ['#6366F1', '#8B5CF6', '#D946EF', '#EC4899', '#F43F5E'];

const TournamentAnalytics = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Tournament Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">24</div>
            <p className="text-sm text-green-500">+12% from last year</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">543</div>
            <p className="text-sm text-green-500">+28% from last year</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Prize Money Awarded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$12,450</div>
            <p className="text-sm text-green-500">+35% from last year</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="participation">
        <TabsList className="mb-6">
          <TabsTrigger value="participation">Participation</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="venues">Venues</TabsTrigger>
        </TabsList>
        
        <TabsContent value="participation">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Monthly Tournament Participation</CardTitle>
              <CardDescription>Number of participants per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={participantData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: 'white'
                      }}
                    />
                    <Bar dataKey="participants" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="games">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Tournament Games Distribution</CardTitle>
              <CardDescription>Breakdown by game title</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gameData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {gameData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: 'white'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="venues">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Top Venues</CardTitle>
              <CardDescription>Most used venues for tournaments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'GameHub Central', count: 8, percentage: 33 },
                  { name: 'Esports Arena', count: 6, percentage: 25 },
                  { name: 'Victory Point Cafe', count: 4, percentage: 17 },
                  { name: 'Pixel Paradise', count: 3, percentage: 12 },
                  { name: 'Gaming Grounds', count: 3, percentage: 12 },
                ].map((venue, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{venue.name}</div>
                      <div className="text-sm text-gray-400">{venue.count} tournaments</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">{venue.percentage}%</div>
                      <div className="w-24 bg-gaming-gray/30 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gaming-purple h-full" 
                          style={{ width: `${venue.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TournamentAnalytics;
