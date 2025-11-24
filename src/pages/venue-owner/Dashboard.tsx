import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Calendar, BarChart3, CreditCard, Trophy } from "lucide-react";
import VenuesList from "@/components/venue-owner/VenuesList";
import BookingHistory from "@/components/venue-owner/BookingHistory";
import VenueAvailability from "@/components/venue-owner/VenueAvailability";
import VenueAnalytics from "@/components/venue-owner/VenueAnalytics";
import VenuePayments from "@/components/venue-owner/VenuePayments";
import { Link } from 'react-router-dom';

const VenueOwnerDashboard = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("venues");

  return (
    <div className="min-h-screen bg-esports-dark text-white flex flex-col">
      <div className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Venue Owner Dashboard</h1>
            <p className="text-gray-400">Welcome back, {profile?.full_name || profile?.username}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Left sidebar */}
            <div className="md:col-span-1">
              <div className="bg-gaming-dark rounded-lg border border-gaming-gray/30 p-4">
                <h2 className="text-xl font-semibold mb-4">Management</h2>
                <nav className="space-y-2">
                  <TabsList className="flex flex-col w-full bg-transparent">
                    <TabsTrigger 
                      value="venues"
                      className="justify-start"
                    >
                      <MapPin className="mr-2 h-5 w-5" />
                      My Venues
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="bookings"
                      className="justify-start"
                    >
                      <Calendar className="mr-2 h-5 w-5" />
                      Booking History
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="availability"
                      className="justify-start"
                    >
                      <Clock className="mr-2 h-5 w-5" />
                      Availability
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="analytics"
                      className="justify-start"
                    >
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Analytics
                    </TabsTrigger>
                    
                    <TabsTrigger 
                      value="payments"
                      className="justify-start"
                    >
                      <CreditCard className="mr-2 h-5 w-5" />
                      Payments
                    </TabsTrigger>
                  </TabsList>
                  <Link to="/tournament-history" className="block px-4 py-2 rounded hover:bg-gaming-purple/20 text-gaming-purple font-semibold mt-2">
                    <Trophy className="inline-block mr-2 h-5 w-5" />
                    Tournament History
                  </Link>
                </nav>
              </div>
            </div>

            {/* Main content area */}
            <div className="md:col-span-4">
              <TabsContent value="venues" className="m-0">
                <VenuesList />
              </TabsContent>

              <TabsContent value="bookings" className="m-0">
                <BookingHistory />
              </TabsContent>

              <TabsContent value="availability" className="m-0">
                <VenueAvailability />
              </TabsContent>

              <TabsContent value="analytics" className="m-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gaming-dark border-gaming-gray/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Total Bookings</CardTitle>
                      <CardDescription>This month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">186</div>
                      <p className="text-sm text-green-500">+24% from last month</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gaming-dark border-gaming-gray/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Revenue</CardTitle>
                      <CardDescription>This month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">$4,280</div>
                      <p className="text-sm text-green-500">+18% from last month</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gaming-dark border-gaming-gray/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg font-medium">Peak Hours</CardTitle>
                      <CardDescription>Most popular time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">6PM-9PM</div>
                      <p className="text-sm text-blue-500">Weekends</p>
                    </CardContent>
                  </Card>
                </div>
                
                <VenueAnalytics />
              </TabsContent>

              <TabsContent value="payments" className="m-0">
                <VenuePayments />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default VenueOwnerDashboard;
