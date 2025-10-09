import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { useDualRole } from '@/contexts/DualRoleContext';

const PayoutSystem: React.FC = () => {
  const { currentMode, playerEarnings, organizerRevenue, venueRevenue } = useDualRole();
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current earnings based on mode
  const getCurrentEarnings = () => {
    switch (currentMode) {
      case 'player': return playerEarnings;
      case 'organizer': return organizerRevenue;
      case 'venue_owner': return venueRevenue;
      default: return 0;
    }
  };

  const getEarningsLabel = () => {
    switch (currentMode) {
      case 'player': return 'Tournament Winnings';
      case 'organizer': return 'Tournament Revenue';
      case 'venue_owner': return 'Venue Bookings';
      default: return 'Earnings';
    }
  };

  // Mock payout history
  const payoutHistory = [
    { id: 1, amount: 500, method: 'PayPal', status: 'completed', date: '2024-02-10', type: 'withdrawal' },
    { id: 2, amount: 250, method: 'Bank Transfer', status: 'pending', date: '2024-02-12', type: 'withdrawal' },
    { id: 3, amount: 1200, method: 'Tournament Win', status: 'completed', date: '2024-02-08', type: 'earning' },
    { id: 4, amount: 800, method: 'Tournament Revenue', status: 'completed', date: '2024-02-05', type: 'earning' },
  ];

  const handleWithdrawal = async () => {
    if (!withdrawalAmount || !paymentMethod) return;
    
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setWithdrawalAmount('');
      setPaymentMethod('');
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'pending': return 'bg-yellow-600';
      case 'failed': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Payout System</h1>
          <p className="text-gray-400">Manage your earnings and withdrawals</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-600 text-white">
            <Wallet className="w-3 h-3 mr-1" />
            {currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} Mode
          </Badge>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Available Balance</p>
                <p className="text-white text-2xl font-bold">${getCurrentEarnings()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-white text-2xl font-bold">${getCurrentEarnings() * 0.3}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-600 rounded-lg">
                <Banknote className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Earned</p>
                <p className="text-white text-2xl font-bold">${getCurrentEarnings() * 2.5}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Withdrawal Form */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Request Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount" className="text-white">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount to withdraw"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <p className="text-gray-400 text-xs mt-1">
                Available: ${getCurrentEarnings()}
              </p>
            </div>

            <div>
              <Label htmlFor="method" className="text-white">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleWithdrawal}
              disabled={isProcessing || !withdrawalAmount || !paymentMethod}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? 'Processing...' : 'Request Withdrawal'}
            </Button>

            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <p className="text-yellow-300 text-sm">
                  Withdrawals are processed within 1-3 business days. Minimum withdrawal: $10
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout History */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Payout History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payoutHistory.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      payout.type === 'earning' ? 'bg-green-600' : 'bg-blue-600'
                    }`}>
                      {payout.type === 'earning' ? 
                        <DollarSign className="w-4 h-4 text-white" /> :
                        <CreditCard className="w-4 h-4 text-white" />
                      }
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {payout.type === 'earning' ? payout.method : `Withdrawal via ${payout.method}`}
                      </p>
                      <p className="text-gray-400 text-sm">{payout.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      payout.type === 'earning' ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      {payout.type === 'earning' ? '+' : '-'}${payout.amount}
                    </p>
                    <Badge className={`${getStatusColor(payout.status)} text-white flex items-center gap-1 text-xs`}>
                      {getStatusIcon(payout.status)}
                      {payout.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayoutSystem;
