
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Search, Download, TrendingUp, DollarSign, Calendar, Users } from "lucide-react";

interface Payment {
  id: string;
  type: 'venue_booking' | 'tournament_entry';
  amount: string;
  user: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  relatedTo: string;
}

const mockPayments: Payment[] = [
  {
    id: 'pay_1',
    type: 'venue_booking',
    amount: '$45.00',
    user: 'gamer123',
    date: '2023-05-15',
    status: 'completed',
    relatedTo: 'GameHub Central',
  },
  {
    id: 'pay_2',
    type: 'tournament_entry',
    amount: '$25.00',
    user: 'player456',
    date: '2023-05-14',
    status: 'completed',
    relatedTo: 'Summer Valorant Championship',
  },
  {
    id: 'pay_3',
    type: 'venue_booking',
    amount: '$60.00',
    user: 'gamer789',
    date: '2023-05-13',
    status: 'pending',
    relatedTo: 'Esports Arena',
  },
  {
    id: 'pay_4',
    type: 'tournament_entry',
    amount: '$15.00',
    user: 'player101',
    date: '2023-05-12',
    status: 'failed',
    relatedTo: 'CS:GO Pro Circuit',
  },
  {
    id: 'pay_5',
    type: 'venue_booking',
    amount: '$30.00',
    user: 'gamer202',
    date: '2023-05-11',
    status: 'completed',
    relatedTo: 'Victory Point Cafe',
  },
];

type AdminPaymentsProps = {
  displayType: 'summary' | 'full';
};

const AdminPayments = ({ displayType }: AdminPaymentsProps) => {
  if (displayType === 'summary') {
    // Show a summary card with recent payments
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between items-center text-white">
            <span className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Recent Payments
            </span>
            <Button variant="outline" size="sm" className="text-xs h-8 border-gray-600 text-gray-300 hover:bg-gray-700">
              <Download size={14} className="mr-1" /> Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPayments.slice(0, 3).map(payment => (
              <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
                <div>
                  <p className="font-medium text-white">{payment.type === 'venue_booking' ? 'Venue Booking' : 'Tournament Entry'}</p>
                  <p className="text-sm text-gray-400">{payment.relatedTo} • {payment.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{payment.amount}</p>
                  <Badge className={
                    payment.status === 'completed' ? 'bg-green-600 text-white' : 
                    payment.status === 'failed' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                  }>
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700" size="sm">
              View All Payments
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show full payments management
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-400" />
            Payment Management
          </h2>
          <p className="text-gray-400">Monitor all platform transactions and revenue</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10 bg-gray-700 border-gray-600 text-white"
              placeholder="Search payments..."
            />
          </div>
          <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
            <Download size={18} className="mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">$48,250</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12.5% from last month
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-white">$6,840</p>
                <p className="text-xs text-blue-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Current period
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Venue Bookings</p>
                <p className="text-2xl font-bold text-white">$32,150</p>
                <p className="text-xs text-purple-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  66.6% of total
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Tournament Entries</p>
                <p className="text-2xl font-bold text-white">$16,100</p>
                <p className="text-xs text-orange-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  33.4% of total
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    
      {/* Payments Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">ID</TableHead>
                  <TableHead className="text-gray-300">Type</TableHead>
                  <TableHead className="text-gray-300">Amount</TableHead>
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Related To</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPayments.map(payment => (
                  <TableRow key={payment.id} className="border-gray-700 hover:bg-gray-700/30">
                    <TableCell className="font-medium text-white">{payment.id}</TableCell>
                    <TableCell className="text-white">
                      {payment.type === 'venue_booking' ? 'Venue Booking' : 'Tournament Entry'}
                    </TableCell>
                    <TableCell className="text-white font-semibold">{payment.amount}</TableCell>
                    <TableCell className="text-gray-300">{payment.user}</TableCell>
                    <TableCell className="text-gray-300">{payment.date}</TableCell>
                    <TableCell>
                      <Badge className={
                        payment.status === 'completed' ? 'bg-green-600 text-white' : 
                        payment.status === 'failed' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                      }>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">{payment.relatedTo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
