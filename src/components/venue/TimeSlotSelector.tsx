
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeSlotSelectorProps {
  timeSlot: string;
  timeSlots: string[];
  onTimeSlotChange: (slot: string) => void;
}

const TimeSlotSelector = ({ timeSlot, timeSlots, onTimeSlotChange }: TimeSlotSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Time Slot</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !timeSlot && "text-muted-foreground"
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {timeSlot || <span>Select time</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-gaming-dark border-gaming-gray/30">
          <div className="p-2 grid grid-cols-2 gap-2 max-h-72 overflow-auto">
            {timeSlots.map(slot => (
              <Button
                key={slot}
                variant="ghost"
                onClick={() => onTimeSlotChange(slot)}
                className={cn(
                  timeSlot === slot && "bg-gaming-purple text-white"
                )}
              >
                {slot}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimeSlotSelector;
