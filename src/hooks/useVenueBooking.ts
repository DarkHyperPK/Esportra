/**
 * useVenueBooking — Domain 8: Venue Booking
 *
 * Migrated from Supabase (3 round-trips: availability + insert + decrement) to
 * .NET API single atomic POST /api/venues/{id}/bookings (check + insert + decrement in one tx).
 *
 * Public interface is backward-compatible (open, setOpen, date, timeSlot, hours, stations,
 * processing, timeSlots, handleBooking, cancelBooking, calculateTotal).
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

export interface UseVenueBookingProps {
  venueId: string;
  venueName: string;
  pricePerHour: number;
  availableStations: number;
}

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
  const { user }     = useAuth();
  const { toast }    = useToast();
  const [open, setOpen]         = useState(false);
  const [date, setDateState]    = useState<Date>();
  const [timeSlot, setTimeSlot] = useState('');
  const [hours, setHours]       = useState(1);
  const [stations, setStations] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [timeSlots, setTimeSlots]   = useState<string[]>([]);

  const generateTimeSlots = useCallback((_selectedDate: Date) => {
    const slots: string[] = [];
    for (let hour = 9; hour < 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    setTimeSlots(slots);
  }, []);

  const calculateTotal = useCallback(
    (duration: number, stationCount: number) => pricePerHour * duration * stationCount,
    [pricePerHour]
  );

  const createBooking = async (formData: BookingFormData): Promise<VenueBooking | null> => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please sign in to make a booking.', variant: 'destructive' });
      return null;
    }
    try {
      setProcessing(true);

      // Single atomic call: backend does availability check + insert + decrement in one tx
      const booking = await apiClient.post<VenueBooking>(`/api/venues/${venueId}/bookings`, {
        date:              formData.date.toISOString().split('T')[0],
        startTime:         formData.timeSlot,
        hours:             formData.hours,
        stations:          formData.stations,
        pricePerHour,
        availableStations,
        specialRequests:   formData.specialRequests ?? null,
        contactPhone:      formData.contactPhone ?? null,
        contactEmail:      formData.contactEmail ?? null,
      });

      const total = pricePerHour * formData.hours * formData.stations;
      toast({ title: 'Booking Created!', description: `Your booking at ${venueName} is confirmed. Total: $${total.toFixed(2)}` });
      setOpen(false);
      return booking;
    } catch (err: any) {
      toast({ title: 'Booking Failed', description: err.message || 'Failed to create booking. Please try again.', variant: 'destructive' });
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const cancelBooking = async (bookingId: string): Promise<boolean> => {
    try {
      setProcessing(true);
      await apiClient.delete(`/api/venues/bookings/${bookingId}`);
      toast({ title: 'Booking Cancelled', description: 'Your booking has been cancelled successfully.' });
      return true;
    } catch (err: any) {
      toast({ title: 'Cancellation Failed', description: err.message || 'Failed to cancel booking.', variant: 'destructive' });
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const handleBooking = async () => {
    if (!date || !timeSlot) {
      toast({ title: 'Missing Information', description: 'Please select a date and time slot.', variant: 'destructive' });
      return;
    }
    await createBooking({
      date, timeSlot, hours, stations,
      contactPhone: user?.phone || '',
      contactEmail: user?.email || '',
    });
  };

  const handleDateChange = (newDate: Date | undefined) => {
    setDateState(newDate);
    if (newDate) generateTimeSlots(newDate);
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
