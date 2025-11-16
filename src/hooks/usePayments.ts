import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMethod {
  id: string;
  type: 'paypal' | 'bank' | 'crypto' | 'stripe';
  provider: string;
  account_details: any;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  type: 'venue_booking' | 'tournament_entry' | 'withdrawal' | 'payout' | 'refund';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  payment_method_id?: string;
  external_payment_id?: string;
  description?: string;
  metadata: any;
  related_entity_type?: string;
  related_entity_id?: string;
  processed_at?: string;
  created_at: string;
}

export interface UserWallet {
  id: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_spent: number;
  currency: string;
}

export const usePayments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  }, [user]);

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  }, [user]);

  // Fetch wallet
  const fetchWallet = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setWallet(data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  }, [user]);

  // Add payment method
  const addPaymentMethod = async (methodData: {
    type: 'paypal' | 'bank' | 'crypto' | 'stripe';
    provider: string;
    account_details: any;
  }) => {
    if (!user) return false;

    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          ...methodData,
          is_primary: paymentMethods.length === 0, // First method is primary
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPaymentMethods();
      toast({
        title: 'Payment Method Added',
        description: 'Your payment method has been added successfully.',
        variant: 'default',
      });

      return true;
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add payment method.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Create payment
  const createPayment = async (paymentData: {
    amount: number;
    type: 'venue_booking' | 'tournament_entry' | 'withdrawal' | 'payout' | 'refund';
    description?: string;
    payment_method_id?: string;
    related_entity_type?: string;
    related_entity_id?: string;
    metadata?: any;
  }) => {
    if (!user) return null;

    try {
      setSubmitting(true);
      
      const { data, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          currency: 'USD',
          status: 'pending',
          ...paymentData,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchPayments();
      await fetchWallet();

      return data;
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  // Process withdrawal
  const processWithdrawal = async (amount: number, paymentMethodId: string) => {
    if (!user || !wallet) return false;

    if (amount > wallet.balance) {
      toast({
        title: 'Insufficient Funds',
        description: 'You do not have enough balance for this withdrawal.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setSubmitting(true);
      
      // Create withdrawal payment
      const payment = await createPayment({
        amount: -amount, // Negative for withdrawal
        type: 'withdrawal',
        description: 'Withdrawal request',
        payment_method_id: paymentMethodId,
        metadata: { withdrawal_request: true },
      });

      if (!payment) return false;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('user_wallets')
        .update({
          balance: wallet.balance - amount,
          pending_balance: wallet.pending_balance + amount,
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      await fetchWallet();
      
      toast({
        title: 'Withdrawal Requested',
        description: 'Your withdrawal request has been submitted and is being processed.',
        variant: 'default',
      });

      return true;
    } catch (error: any) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: 'Withdrawal Failed',
        description: error.message || 'Failed to process withdrawal.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize data
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchPaymentMethods(),
        fetchPayments(),
        fetchWallet(),
      ]).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchPaymentMethods, fetchPayments, fetchWallet]);

  return {
    paymentMethods,
    payments,
    wallet,
    loading,
    submitting,
    
    // Actions
    addPaymentMethod,
    createPayment,
    processWithdrawal,
    fetchPaymentMethods,
    fetchPayments,
    fetchWallet,
  };
};
