
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export interface UseVenueBookingProps {
  venueId: string;
  venueName: string;
  pricePerHour: number;
  availableStations: number;
}

export const useVenueBooking = ({ 
  venueId, 
  venueName,
  pricePerHour, 
  availableStations 
}: UseVenueBookingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [hours, setHours] = useState<number>(1);
  const [stations, setStations] = useState(1);
  const [processing, setProcessing] = useState(false);

  const timeSlots = [
    '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', 
    '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', 
    '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'
  ];

  const handleBooking = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book this venue",
        variant: "destructive",
      });
      navigate('/auth/signin');
      return;
    }

    if (!date || !timeSlot) {
      toast({
        title: "Missing Information",
        description: "Please select a date and time for your booking",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const amount = pricePerHour * hours * stations;
      console.log("Booking venue with data:", {
        user_id: user.id,
        venue_id: venueId,
        booking_date: date.toISOString().split('T')[0],
        booking_time: timeSlot,
        hours: hours,
        stations: stations,
        amount: amount,
        status: 'pending'
      });
      
      const { error } = await supabase
        .from('venue_bookings')
        .insert({
          user_id: user.id,
          venue_id: venueId,
          booking_date: date.toISOString().split('T')[0],
          booking_time: timeSlot,
          hours: hours,
          stations: stations,
          amount: amount,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Booking Created",
        description: `Your booking for ${venueName} has been created successfully!`,
      });

      setOpen(false);

      setTimeout(() => {
        toast({
          title: "Payment Successful",
          description: "Your booking has been confirmed. See you there!",
        });
        navigate('/user/dashboard');
      }, 1500);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast({
        title: "Booking Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return {
    open,
    setOpen,
    date,
    setDate,
    timeSlot,
    setTimeSlot,
    hours,
    setHours,
    stations,
    setStations,
    processing,
    timeSlots,
    handleBooking
  };
};
