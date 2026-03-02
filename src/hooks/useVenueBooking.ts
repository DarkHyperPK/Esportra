import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface UseVenueBookingProps {
  venueId: string;
  venueName: string;
  pricePerHour: number;
  availableStations: number;
}

// Keep VenueBookingData as an alias for backwards compatibility
export type VenueBookingData = UseVenueBookingProps;

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

export const useVenueBooking = ({ venueId, venueName, pricePerHour, availableStations }: UseVenueBookingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState('');
  const [hours, setHours] = useState(1);
  const [stations, setStations] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Generate available time slots (9 AM – 10 PM)
  const generateTimeSlots = useCallback((_selectedDate: Date) => {
    const slots: string[] = [];
    for (let hour = 9; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    setTimeSlots(slots);
  }, []);

  // Check venue_availability for a specific slot.
  // Returns the record if found, null if the slot has no record (treated as open).
  const checkAvailability = useCallback(async (
    selectedDate: Date,
    selectedTime: string,
  ) => {
    const { data, error } = await supabase
      .from('venue_availability')
      .select('id, available_stations, price_per_hour, is_available')
      .eq('venue_id', venueId)
      .eq('date', selectedDate.toISOString().split('T')[0])
      .eq('start_time', selectedTime)
      .maybeSingle();

    if (error) {
      console.error('Error checking availability:', error);
      return null;
    }
    return data;
  }, [venueId]);

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

      // Check availability — if a record exists, validate station count.
      // If no record, we allow the booking (venue has open availability).
      const availability = await checkAvailability(formData.date, formData.timeSlot);
      if (availability) {
        if (!availability.is_available || availability.available_stations < formData.stations) {
          toast({
            title: 'Not Available',
            description: 'The selected time slot does not have enough stations available.',
            variant: 'destructive',
          });
          return null;
        }
      } else {
        // No availability record — check against venue's station count
        if (formData.stations > availableStations) {
          toast({
            title: 'Invalid Selection',
            description: `Only ${availableStations} stations are available at this venue.`,
            variant: 'destructive',
          });
          return null;
        }
      }

      // Calculate end time
      const startTime = new Date(`2000-01-01T${formData.timeSlot}:00`);
      const endTime = new Date(startTime.getTime() + formData.hours * 60 * 60 * 1000);
      const endTimeString = endTime.toTimeString().slice(0, 5);

      // Use availability price if available, otherwise fall back to prop
      const effectivePrice = availability?.price_per_hour ?? pricePerHour;
      const totalAmount = effectivePrice * formData.hours * formData.stations;

      // Insert booking
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
          special_requests: formData.specialRequests || null,
          contact_phone: formData.contactPhone || null,
          contact_email: formData.contactEmail || null,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Decrement available stations only if we had a record to update
      if (availability) {
        await supabase
          .from('venue_availability')
          .update({
            available_stations: availability.available_stations - formData.stations,
          })
          .eq('venue_id', venueId)
          .eq('date', formData.date.toISOString().split('T')[0])
          .eq('start_time', formData.timeSlot);
      }

      toast({
        title: 'Booking Created!',
        description: `Your booking at ${venueName} is confirmed. Total: $${totalAmount.toFixed(2)}`,
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

    const formData: BookingFormData = {
      date,
      timeSlot,
      hours,
      stations,
      contactPhone: user?.phone || '',
      contactEmail: user?.email || '',
    };

    await createBooking(formData);
  };

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
