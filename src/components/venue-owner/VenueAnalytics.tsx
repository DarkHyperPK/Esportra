
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const mockRevenueData = [
  { name: 'Jan', revenue: 3800 },
  { name: 'Feb', revenue: 4200 },
  { name: 'Mar', revenue: 5100 },
  { name: 'Apr', revenue: 4800 },
  { name: 'May', revenue: 6200 },
  { name: 'Jun', revenue: 5500 },
  { name: 'Jul', revenue: 6800 }
];

const mockBookingsData = [
  { name: 'Mon', bookings: 12 },
  { name: 'Tue', bookings: 8 },
  { name: 'Wed', bookings: 15 },
  { name: 'Thu', bookings: 10 },
  { name: 'Fri', bookings: 20 },
  { name: 'Sat', bookings: 24 },
  { name: 'Sun', bookings: 18 }
];

const mockUtilizationData = [
  { name: 'Morning', value: 25 },
  { name: 'Afternoon', value: 40 },
  { name: 'Evening', value: 35 }
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658'];

const VenueAnalytics = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Venue Analytics</h2>
        <Select defaultValue="gamehub">
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select venue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gamehub">GameHub Central</SelectItem>
            <SelectItem value="esports">Esports Arena</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$32,400</div>
            <p className="text-sm text-green-500">+18% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">248</div>
            <p className="text-sm text-green-500">+12% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Avg. Booking Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$130.65</div>
            <p className="text-sm text-green-500">+5% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Station Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">68%</div>
            <p className="text-sm text-green-500">+8% from last month</p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="revenue">
        <TabsList className="mb-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Revenue generated per month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, 'Revenue']}
                      contentStyle={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        color: 'white'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bookings">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Bookings by Day of Week</CardTitle>
              <CardDescription>Number of bookings per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockBookingsData}>
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
                    <Bar dataKey="bookings" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="utilization">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gaming-dark border-gaming-gray/30">
              <CardHeader>
                <CardTitle>Station Utilization by Time of Day</CardTitle>
                <CardDescription>How stations are being used throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockUtilizationData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {mockUtilizationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
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
            
            <Card className="bg-gaming-dark border-gaming-gray/30">
              <CardHeader>
                <CardTitle>Popular Gaming Stations</CardTitle>
                <CardDescription>Most frequently booked stations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Gaming PC #3', bookings: 48, percentage: 85 },
                    { name: 'Gaming PC #5', bookings: 42, percentage: 75 },
                    { name: 'PS5 Station #2', bookings: 36, percentage: 65 },
                    { name: 'Gaming PC #1', bookings: 30, percentage: 54 },
                    { name: 'Xbox Series X #1', bookings: 28, percentage: 50 },
                  ].map((station, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{station.name}</div>
                        <div className="text-sm text-gray-400">{station.bookings} bookings</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">{station.percentage}%</div>
                        <div className="w-24 bg-gaming-gray/30 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gaming-purple h-full" 
                            style={{ width: `${station.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VenueAnalytics;
