
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, MapPin, X, Check, AlertCircle } from "lucide-react";

interface Booking {
  id: string;
  venue: string;
  location: string;
  date: string;
  time: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled';
  amount: string;
}

const mockBookings: Booking[] = [
  {
    id: '1',
    venue: 'GameHub Central',
    location: 'New York, NY',
    date: '2025-05-15',
    time: '14:00',
    duration: 2,
    status: 'confirmed',
    amount: '$30.00'
  },
  {
    id: '2',
    venue: 'Esports Arena',
    location: 'Los Angeles, CA',
    date: '2025-05-18',
    time: '16:00',
    duration: 3,
    status: 'pending',
    amount: '$60.00'
  },
  {
    id: '3',
    venue: 'Victory Point Cafe',
    location: 'San Francisco, CA',
    date: '2025-04-25',
    time: '18:00',
    duration: 2,
    status: 'cancelled',
    amount: '$24.00'
  }
];

const PlayerBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    // In a real implementation, this would fetch from your API
    setBookings(mockBookings);
  }, []);

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const pastBookings = bookings.filter(b => b.status === 'cancelled');
  
  const handleFindVenues = () => {
    navigate('/venues/search');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'cancelled':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Venue Bookings</h2>
        <Button 
          className="bg-gaming-purple hover:bg-gaming-purple/80"
          onClick={handleFindVenues}
        >
          Find Venues
        </Button>
      </div>
      
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingBookings.length === 0 ? (
            <Card className="bg-[#0a0a0c] border-white/10/30">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-gray-400 mb-4">You don't have any upcoming bookings</div>
                <Button onClick={handleFindVenues}>Find Gaming Venues</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="bg-[#0a0a0c] border-white/10/30">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between mb-4">
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-xl font-semibold">{booking.venue}</h3>
                          <div className="ml-3">{getStatusBadge(booking.status)}</div>
                        </div>
                        <p className="text-sm text-gray-400">{booking.location}</p>
                      </div>
                      <div className="text-lg font-bold mt-2 md:mt-0">{booking.amount}</div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 mr-2 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-400">Date</div>
                          <div>{new Date(booking.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-400">Time</div>
                          <div>{booking.time} ({booking.duration} hours)</div>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-5 w-5 mr-2 flex items-center justify-center">
                          {getStatusIcon(booking.status)}
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Status</div>
                          <div>{booking.status}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">View Details</Button>
                      {booking.status !== 'cancelled' && (
                        <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          <Card className="bg-[#0a0a0c] border-white/10/30">
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-zinc-800/10">
                    <TableHead>Venue</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pastBookings.length > 0 ? (
                    pastBookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-zinc-800/5">
                        <TableCell>
                          <div className="font-medium">{booking.venue}</div>
                          <div className="text-sm text-gray-400">{booking.location}</div>
                        </TableCell>
                        <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
                        <TableCell>{booking.time}</TableCell>
                        <TableCell>{booking.duration} hours</TableCell>
                        <TableCell>{booking.amount}</TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                        No past bookings found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlayerBookings;

