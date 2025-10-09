
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ArrowDown, ArrowUp, Download, Calendar, Filter } from "lucide-react";

interface Payment {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: 'completed' | 'pending' | 'refunded';
  method: string;
  customer: string;
}

const mockPayments: Payment[] = [
  {
    id: 'PAY-001',
    date: '2025-05-01',
    description: 'Booking #2501 - 4 stations, 2 hours',
    amount: '$60.00',
    status: 'completed',
    method: 'Credit Card',
    customer: 'John Smith'
  },
  {
    id: 'PAY-002',
    date: '2025-05-02',
    description: 'Booking #2502 - 6 stations, 3 hours',
    amount: '$90.00',
    status: 'completed',
    method: 'PayPal',
    customer: 'Jane Doe'
  },
  {
    id: 'PAY-003',
    date: '2025-05-03',
    description: 'Booking #2503 - 2 stations, 2 hours',
    amount: '$30.00',
    status: 'refunded',
    method: 'Credit Card',
    customer: 'Mike Johnson'
  },
  {
    id: 'PAY-004',
    date: '2025-05-04',
    description: 'Booking #2504 - 8 stations, 4 hours',
    amount: '$120.00',
    status: 'pending',
    method: 'Bank Transfer',
    customer: 'Sarah Wilson'
  },
  {
    id: 'PAY-005',
    date: '2025-05-05',
    description: 'Booking #2505 - 3 stations, 2 hours',
    amount: '$45.00',
    status: 'completed',
    method: 'Credit Card',
    customer: 'David Brown'
  }
];

const VenuePayments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  useEffect(() => {
    // In a real implementation, this would fetch from your API
    setPayments(mockPayments);
  }, []);

  const filteredPayments = payments
    .filter(payment => 
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(payment => 
      statusFilter === 'all' || payment.status === statusFilter
    );

  const totalEarnings = mockPayments
    .filter(payment => payment.status === 'completed')
    .reduce((sum, payment) => sum + parseFloat(payment.amount.replace('$', '')), 0);

  const pendingAmount = mockPayments
    .filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + parseFloat(payment.amount.replace('$', '')), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'refunded':
        return <Badge className="bg-red-500">Refunded</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment History</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              className="pl-10 bg-gaming-gray/10 border-gaming-gray/30 w-60"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardContent className="flex items-center p-6">
            <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center mr-4">
              <ArrowDown className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Earnings</div>
              <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardContent className="flex items-center p-6">
            <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center mr-4">
              <ArrowUp className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <div className="text-sm text-gray-400">Pending Amount</div>
              <div className="text-2xl font-bold">${pendingAmount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gaming-dark border-gaming-gray/30">
          <CardContent className="flex items-center justify-center p-6">
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download Statement
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-gaming-dark border-gaming-gray/30">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-400">
              Showing {filteredPayments.length} of {payments.length} payments
            </div>
          </div>
          
          <div className="rounded-md border border-gaming-gray/30 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gaming-gray/5 hover:bg-gaming-gray/10">
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gaming-gray/5">
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>{payment.customer}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-right font-bold">{payment.amount}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                      No payments found matching your criteria.
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

export default VenuePayments;
