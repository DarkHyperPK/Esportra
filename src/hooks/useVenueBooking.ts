import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface VenueBookingData {
  venueId: string;
  venueName: string;
  pricePerHour: number;
  availableStations: number;
}

export interface BookingFormData {
  date: Date;
  timeSlot: string;
  hours: number;
  stations: number;
  specialRequests?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface VenueBooking {
  id: string;
  venue_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  stations_booked: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  payment_id?: string;
  special_requests?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

export const useVenueBooking = ({ venueId, venueName, pricePerHour, availableStations }: VenueBookingData) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState('');
  const [hours, setHours] = useState(1);
  const [stations, setStations] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Generate available time slots
  const generateTimeSlots = useCallback((selectedDate: Date) => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 22; // 10 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    setTimeSlots(slots);
  }, []);

  // Check venue availability
  const checkAvailability = useCallback(async (selectedDate: Date, selectedTime: string, duration: number) => {
    try {
      const { data, error } = await supabase
        .from('venue_availability')
        .select('available_stations, price_per_hour')
        .eq('venue_id', venueId)
        .eq('date', selectedDate.toISOString().split('T')[0])
        .eq('start_time', selectedTime)
        .eq('is_available', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    } catch (error) {
      console.error('Error checking availability:', error);
      return null;
    }
  }, [venueId]);

  // Calculate total amount
  const calculateTotal = useCallback((duration: number, stationCount: number) => {
    return pricePerHour * duration * stationCount;
  }, [pricePerHour]);

  // Create booking
  const createBooking = async (formData: BookingFormData) => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to make a booking.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setProcessing(true);

      // Check availability
      const availability = await checkAvailability(formData.date, formData.timeSlot, formData.hours);
      if (!availability || availability.available_stations < formData.stations) {
        toast({
          title: 'Not Available',
          description: 'The selected time slot is not available.',
          variant: 'destructive',
        });
        return null;
      }

      // Calculate end time
      const startTime = new Date(`2000-01-01T${formData.timeSlot}`);
      const endTime = new Date(startTime.getTime() + formData.hours * 60 * 60 * 1000);
      const endTimeString = endTime.toTimeString().slice(0, 5);

      // Calculate total amount
      const totalAmount = calculateTotal(formData.hours, formData.stations);

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from('venue_bookings')
        .insert({
          venue_id: venueId,
          user_id: user.id,
          booking_date: formData.date.toISOString().split('T')[0],
          start_time: formData.timeSlot,
          end_time: endTimeString,
          duration_hours: formData.hours,
          stations_booked: formData.stations,
          total_amount: totalAmount,
          status: 'pending',
          special_requests: formData.specialRequests,
          contact_phone: formData.contactPhone,
          contact_email: formData.contactEmail,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: totalAmount,
          type: 'venue_booking',
          description: `Venue booking at ${venueName}`,
          related_entity_type: 'venue_booking',
          related_entity_id: booking.id,
          status: 'pending',
          metadata: {
            venue_id: venueId,
            venue_name: venueName,
            booking_date: formData.date.toISOString().split('T')[0],
            start_time: formData.timeSlot,
            end_time: endTimeString,
            stations: formData.stations,
          },
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update booking with payment ID
      const { error: updateError } = await supabase
        .from('venue_bookings')
        .update({ payment_id: payment.id })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // Update venue availability
      const { error: availabilityError } = await supabase
        .from('venue_availability')
        .update({
          available_stations: availability.available_stations - formData.stations,
        })
        .eq('venue_id', venueId)
        .eq('date', formData.date.toISOString().split('T')[0])
        .eq('start_time', formData.timeSlot);

      if (availabilityError) throw availabilityError;

      toast({
        title: 'Booking Created',
        description: 'Your venue booking has been created successfully. Payment is pending.',
        variant: 'default',
      });

      setOpen(false);
      return booking;

    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: 'Booking Failed',
        description: error.message || 'Failed to create booking. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId: string) => {
    try {
      setProcessing(true);

      const { error } = await supabase
        .from('venue_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Booking Cancelled',
        description: 'Your booking has been cancelled successfully.',
        variant: 'default',
      });

      return true;
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel booking.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Handle booking form submission
  const handleBooking = async () => {
    if (!date || !timeSlot) {
      toast({
        title: 'Missing Information',
        description: 'Please select a date and time slot.',
        variant: 'destructive',
      });
      return;
    }

    if (stations > availableStations) {
      toast({
        title: 'Invalid Selection',
        description: `Only ${availableStations} stations are available.`,
        variant: 'destructive',
      });
      return;
    }

    const formData: BookingFormData = {
      date,
      timeSlot,
      hours,
      stations,
      specialRequests: '',
      contactPhone: user?.phone || '',
      contactEmail: user?.email || '',
    };

    await createBooking(formData);
  };

  // Update time slots when date changes
  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    if (newDate) {
      generateTimeSlots(newDate);
    }
  };

  return {
    open,
    setOpen,
    date,
    setDate: handleDateChange,
    timeSlot,
    setTimeSlot,
    hours,
    setHours,
    stations,
    setStations,
    processing,
    timeSlots,
    handleBooking,
    cancelBooking,
    calculateTotal: () => calculateTotal(hours, stations),
  };
};