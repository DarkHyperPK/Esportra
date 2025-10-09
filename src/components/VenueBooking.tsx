
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import TimeSlotSelector from './venue/TimeSlotSelector';
import StationSelector from './venue/StationSelector';
import { useVenueBooking, UseVenueBookingProps } from '@/hooks/useVenueBooking';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const VenueBooking: React.FC<UseVenueBookingProps> = ({ venueId, venueName, pricePerHour, availableStations }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
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
  } = useVenueBooking({ venueId, venueName, pricePerHour, availableStations });

  const handleButtonClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book this venue",
        variant: "destructive",
      });
      navigate('/auth/signin');
      return;
    }
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        className="bg-gaming-purple hover:bg-gaming-purple/80"
        onClick={handleButtonClick}
      >
        Book Now
      </Button>
      <DialogContent className="bg-gaming-dark text-white border-gaming-gray/30 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book {venueName}</DialogTitle>
          <DialogDescription>
            Select your preferred date, time slot and number of stations
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-gaming-dark border-gaming-gray/30">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <TimeSlotSelector 
            timeSlot={timeSlot}
            timeSlots={timeSlots}
            onTimeSlotChange={setTimeSlot}
          />
          
          <StationSelector 
            stations={stations}
            availableStations={availableStations}
            onStationsChange={setStations}
          />
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Hours</Label>
              <span className="text-sm text-gaming-purple">{hours} hour(s)</span>
            </div>
            <Slider
              value={[hours]}
              max={8}
              min={1}
              step={1}
              onValueChange={(value) => setHours(value[0])}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 hour</span>
              <span>8 hours</span>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex justify-between items-center">
              <span>Price per hour/station:</span>
              <span>${pricePerHour.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Hours:</span>
              <span>{hours}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Stations:</span>
              <span>{stations}</span>
            </div>
            <div className="flex justify-between items-center font-bold border-t border-gray-700 pt-2 mt-2">
              <span>Total:</span>
              <span>${(pricePerHour * hours * stations).toFixed(2)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleBooking} 
            disabled={!date || !timeSlot || processing}
            className="bg-gaming-purple hover:bg-gaming-purple/80"
          >
            {processing ? 'Processing...' : 'Confirm & Pay'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VenueBooking;
