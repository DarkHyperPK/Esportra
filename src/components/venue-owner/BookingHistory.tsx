
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Check, X, Calendar, AlertCircle } from "lucide-react";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  venue: string;
  date: string;
  time: string;
  duration: number;
  stations: number;
  amount: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

const mockBookings: Booking[] = [
  {
    id: '1',
    customerName: 'John Smith',
    customerEmail: 'john@example.com',
    venue: 'GameHub Central',
    date: '2025-05-15',
    time: '14:00',
    duration: 2,
    stations: 4,
    amount: '$60.00',
    status: 'confirmed'
  },
  {
    id: '2',
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    venue: 'GameHub Central',
    date: '2025-05-18',
    time: '16:00',
    duration: 3,
    stations: 6,
    amount: '$90.00',
    status: 'pending'
  },
  {
    id: '3',
    customerName: 'Mike Johnson',
    customerEmail: 'mike@example.com',
    venue: 'GameHub Central',
    date: '2025-04-25',
    time: '18:00',
    duration: 2,
    stations: 2,
    amount: '$30.00',
    status: 'cancelled'
  },
  {
    id: '4',
    customerName: 'Sarah Wilson',
    customerEmail: 'sarah@example.com',
    venue: 'GameHub Central',
    date: '2025-05-20',
    time: '15:00',
    duration: 4,
    stations: 8,
    amount: '$120.00',
    status: 'confirmed'
  },
  {
    id: '5',
    customerName: 'David Brown',
    customerEmail: 'david@example.com',
    venue: 'GameHub Central',
    date: '2025-05-22',
    time: '17:00',
    duration: 2,
    stations: 3,
    amount: '$45.00',
    status: 'pending'
  }
];

const BookingHistory = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // In a real implementation, this would fetch from your API
    setBookings(mockBookings);
  }, []);

  const filteredBookings = bookings.filter(
    booking => booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
               booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleApprove = (id: string) => {
    setBookings(bookings.map(booking => 
      booking.id === id ? { ...booking, status: 'confirmed' } : booking
    ));
  };

  const handleReject = (id: string) => {
    setBookings(bookings.map(booking => 
      booking.id === id ? { ...booking, status: 'cancelled' } : booking
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Booking History</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10 bg-gaming-gray/10 border-gaming-gray/30 w-60"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar View
          </Button>
        </div>
      </div>
      
      <Card className="bg-gaming-dark border-gaming-gray/30">
        <CardContent className="p-6">
          <div className="rounded-md border border-gaming-gray/30 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gaming-gray/5 hover:bg-gaming-gray/10">
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Stations</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.id} className="hover:bg-gaming-gray/5">
                      <TableCell>
                        <div className="font-medium">{booking.customerName}</div>
                        <div className="text-sm text-gray-400">{booking.customerEmail}</div>
                      </TableCell>
                      <TableCell>{new Date(booking.date).toLocaleDateString()}</TableCell>
                      <TableCell>{booking.time}</TableCell>
                      <TableCell>{booking.duration} hours</TableCell>
                      <TableCell>{booking.stations}</TableCell>
                      <TableCell className="font-medium">{booking.amount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(booking.status)}
                          {getStatusBadge(booking.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => handleApprove(booking.id)}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                onClick={() => handleReject(booking.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {booking.status === 'confirmed' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => handleReject(booking.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          {booking.status === 'cancelled' && (
                            <Button size="sm" variant="outline">
                              Details
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                      No bookings found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingHistory;
