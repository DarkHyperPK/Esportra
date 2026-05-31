import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Calendar, Clock, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PlayerBooking = {
  id: string;
  venue_id: string;
  booking_date?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  booking_time?: string | null;
  duration_hours?: number | null;
  hours?: number | null;
  stations_booked?: number | null;
  total_amount?: number | null;
  amount?: number | null;
  status?: string | null;
  booking_code?: string | null;
  venues?: { name?: string | null; address?: string | null; city?: string | null } | Array<{ name?: string | null; address?: string | null; city?: string | null }> | null;
};

const getVenue = (booking: PlayerBooking) => Array.isArray(booking.venues) ? booking.venues[0] : booking.venues;
const getBookingDate = (booking: PlayerBooking) => booking.booking_date ?? booking.date ?? null;
const getStartTime = (booking: PlayerBooking) => booking.start_time ?? booking.booking_time ?? null;
const getDuration = (booking: PlayerBooking) => booking.duration_hours ?? booking.hours ?? null;
const getAmount = (booking: PlayerBooking) => booking.total_amount ?? booking.amount ?? null;

const isUpcomingBooking = (booking: PlayerBooking) => {
  const status = (booking.status ?? '').toLowerCase();
  if (status === 'cancelled' || status === 'completed') return false;

  const date = getBookingDate(booking);
  if (!date) return true;

  const bookingDay = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  bookingDay.setHours(0, 0, 0, 0);
  return bookingDay >= today;
};

const formatDate = (value: string | null) => {
  if (!value) return 'Date pending';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatAmount = (amount: number | null) => {
  if (amount == null) return null;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
};

const fetchPlayerBookings = async (userId: string): Promise<PlayerBooking[]> => {
  const { data, error } = await supabase
    .from('venue_bookings')
    .select(`
      id,
      venue_id,
      user_id,
      booking_date,
      start_time,
      end_time,
      duration_hours,
      stations_booked,
      total_amount,
      status,
      booking_code,
      created_at,
      venues(name, address, city)
    `)
    .eq('user_id', userId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as PlayerBooking[];
};

const PlayerBookings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const bookingsQuery = useQuery({
    queryKey: ['player', 'venue-bookings', user?.id],
    queryFn: () => fetchPlayerBookings(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const bookings = bookingsQuery.data ?? [];
  const upcomingBookings = useMemo(() => bookings.filter(isUpcomingBooking), [bookings]);
  const pastBookings = useMemo(() => bookings.filter((booking) => !isUpcomingBooking(booking)), [bookings]);

  const handleFindVenues = () => {
    navigate('/venues/search');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">My Venue Bookings</h2>
        <Button className="bg-rose-500 hover:bg-rose-500/80" onClick={handleFindVenues}>
          Find Venues
        </Button>
      </div>

      {bookingsQuery.isLoading && (
        <Card className="bg-[#0a0a0c] border-white/10">
          <CardContent className="space-y-4 p-6">
            {[0, 1].map((item) => (
              <div key={item} className="h-24 animate-pulse border border-white/10 bg-white/[0.03]" />
            ))}
          </CardContent>
        </Card>
      )}

      {bookingsQuery.isError && (
        <Card className="bg-[#0a0a0c] border-red-500/20">
          <CardContent className="flex items-start gap-4 p-6">
            <AlertCircle className="mt-1 h-5 w-5 text-red-400" />
            <div>
              <h3 className="font-bold text-white">Could not load bookings</h3>
              <p className="mt-1 text-sm text-gray-400">
                Your bookings are not being hidden as empty; the booking data source returned an error. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!bookingsQuery.isLoading && !bookingsQuery.isError && bookings.length === 0 && (
        <Card className="bg-[#0a0a0c] border-white/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 mb-6 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Calendar className="h-10 w-10 text-rose-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Bookings Yet</h3>
            <p className="text-gray-400 max-w-md mb-6">
              You haven't booked any gaming venues yet. Discover and book esports arenas, LAN centers, and gaming cafes near you.
            </p>
            <Button onClick={handleFindVenues}>Find Gaming Venues</Button>
          </CardContent>
        </Card>
      )}

      {upcomingBookings.length > 0 && (
        <BookingSection title={`Upcoming (${upcomingBookings.length})`} bookings={upcomingBookings} />
      )}

      {pastBookings.length > 0 && (
        <BookingSection title={`Past (${pastBookings.length})`} bookings={pastBookings} muted />
      )}
    </div>
  );
};

const BookingSection = ({ title, bookings, muted = false }: { title: string; bookings: PlayerBooking[]; muted?: boolean }) => (
  <section className="space-y-3">
    <h3 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{title}</h3>
    <div className="grid gap-4">
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} muted={muted} />
      ))}
    </div>
  </section>
);

const BookingCard = ({ booking, muted }: { booking: PlayerBooking; muted: boolean }) => {
  const venue = getVenue(booking);
  const date = getBookingDate(booking);
  const start = getStartTime(booking);
  const amount = formatAmount(getAmount(booking));
  const status = booking.status ?? 'pending';

  return (
    <Card className="bg-[#0a0a0c] border-white/10">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-lg font-bold text-white">{venue?.name ?? 'Gaming venue'}</h4>
              <Badge className={muted ? 'bg-zinc-700 text-zinc-200' : 'bg-rose-500/15 text-rose-300 border border-rose-500/20'}>
                {status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-2">
                <Calendar className="h-4 w-4 text-zinc-500" />
                {formatDate(date)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-500" />
                {start ?? 'Time pending'}{booking.end_time ? ` - ${booking.end_time}` : ''}
              </span>
              {venue?.city || venue?.address ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-zinc-500" />
                  {[venue.address, venue.city].filter(Boolean).join(', ')}
                </span>
              ) : null}
            </div>
          </div>
          <div className="text-left md:text-right">
            {amount && <p className="text-lg font-black text-white">{amount}</p>}
            {getDuration(booking) != null && (
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{getDuration(booking)} hour booking</p>
            )}
            {booking.booking_code && (
              <p className="mt-2 font-mono text-xs text-rose-300">Code {booking.booking_code}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlayerBookings;
