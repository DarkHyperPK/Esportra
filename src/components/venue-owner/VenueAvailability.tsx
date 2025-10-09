
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Save } from "lucide-react";

// Mock time slots
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 9; i <= 22; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`);
    if (i !== 22) slots.push(`${i.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

const timeSlots = generateTimeSlots();

// Mock operating hours
const defaultHours = {
  monday: { open: '09:00', close: '22:00', isOpen: true },
  tuesday: { open: '09:00', close: '22:00', isOpen: true },
  wednesday: { open: '09:00', close: '22:00', isOpen: true },
  thursday: { open: '09:00', close: '22:00', isOpen: true },
  friday: { open: '09:00', close: '23:00', isOpen: true },
  saturday: { open: '10:00', close: '23:00', isOpen: true },
  sunday: { open: '12:00', close: '20:00', isOpen: true },
};

// Mock booked slots
const bookedSlots = {
  '2025-05-05': ['10:00', '10:30', '11:00', '11:30'],
  '2025-05-06': ['14:00', '14:30', '15:00', '15:30'],
  '2025-05-08': ['18:00', '18:30', '19:00', '19:30'],
};

const VenueAvailability = () => {
  const [selectedVenue, setSelectedVenue] = useState('gamehub');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [operatingHours, setOperatingHours] = useState(defaultHours);
  const [specialDates, setSpecialDates] = useState<string[]>([]);
  
  const formattedDate = date ? date.toISOString().split('T')[0] : '';
  const bookedSlotsForDate = bookedSlots[formattedDate] || [];
  
  const toggleDayStatus = (day: keyof typeof operatingHours) => {
    setOperatingHours({
      ...operatingHours,
      [day]: {
        ...operatingHours[day],
        isOpen: !operatingHours[day].isOpen
      }
    });
  };

  const updateOpeningHours = (day: keyof typeof operatingHours, time: string, type: 'open' | 'close') => {
    setOperatingHours({
      ...operatingHours,
      [day]: {
        ...operatingHours[day],
        [type]: time
      }
    });
  };

  const isTimeSlotBooked = (time: string) => {
    return bookedSlotsForDate.includes(time);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Venue Availability</h2>
        <Select value={selectedVenue} onValueChange={setSelectedVenue}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select venue" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gamehub">GameHub Central</SelectItem>
            <SelectItem value="esports">Esports Arena</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="calendar">
        <TabsList className="mb-6">
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="hours">Operating Hours</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gaming-dark border-gaming-gray/30">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="bg-gaming-dark text-white"
                  classNames={{
                    day_selected: "bg-gaming-purple text-white hover:bg-gaming-purple hover:text-white",
                    day_today: "border border-gaming-purple/50 text-white",
                    day: "hover:bg-gaming-gray/20"
                  }}
                />
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Available</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Partially booked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">Fully booked</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2 bg-gaming-dark border-gaming-gray/30">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Availability for {date?.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <Badge className={bookedSlotsForDate.length > 0 ? 'bg-yellow-500' : 'bg-green-500'}>
                    {bookedSlotsForDate.length > 0 ? 'Partially Booked' : 'Available'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={isTimeSlotBooked(time) ? "secondary" : "outline"}
                      className={`${isTimeSlotBooked(time) ? 'bg-gaming-gray/20 text-gray-400 cursor-not-allowed' : ''}`}
                      disabled={isTimeSlotBooked(time)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      {time}
                    </Button>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-6">
                  <div>
                    <Badge variant="outline" className="mr-2">8 stations available</Badge>
                    <Badge variant="outline">12 stations total</Badge>
                  </div>
                  <Button className="bg-red-500 hover:bg-red-600">Block Day</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="hours">
          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <CardTitle>Operating Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(operatingHours).map(([day, hours]) => (
                  <div key={day} className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 pb-4 border-b border-gaming-gray/30">
                    <div className="flex items-center justify-between md:justify-start">
                      <div className="font-medium capitalize">{day}</div>
                      <div className="md:hidden">
                        <Switch 
                          checked={hours.isOpen} 
                          onCheckedChange={() => toggleDayStatus(day as keyof typeof operatingHours)}
                        />
                      </div>
                    </div>
                    
                    <div className="md:col-span-3 grid grid-cols-2 gap-4">
                      <div>
                        <Select
                          value={hours.open}
                          onValueChange={(value) => updateOpeningHours(
                            day as keyof typeof operatingHours, 
                            value, 
                            'open'
                          )}
                          disabled={!hours.isOpen}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Opening time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.slice(0, -1).map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Select
                          value={hours.close}
                          onValueChange={(value) => updateOpeningHours(
                            day as keyof typeof operatingHours, 
                            value, 
                            'close'
                          )}
                          disabled={!hours.isOpen}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Closing time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.slice(1).map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex justify-end">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id={`${day}-switch`}
                          checked={hours.isOpen} 
                          onCheckedChange={() => toggleDayStatus(day as keyof typeof operatingHours)}
                        />
                        <Label htmlFor={`${day}-switch`}>{hours.isOpen ? 'Open' : 'Closed'}</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <Button className="flex items-center gap-2">
                  <Save size={16} />
                  Save Hours
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gaming-dark border-gaming-gray/30 mt-6">
            <CardHeader>
              <CardTitle>Special Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Holidays and Special Closures</Label>
                  <Calendar
                    mode="multiple"
                    selected={specialDates.map(date => new Date(date))}
                    onSelect={(dates) => setSpecialDates(
                      dates ? dates.map(date => date.toISOString().split('T')[0]) : []
                    )}
                    className="bg-gaming-dark text-white"
                    classNames={{
                      day_selected: "bg-red-500 text-white hover:bg-red-600 hover:text-white",
                      day_today: "border border-gaming-purple/50 text-white",
                      day: "hover:bg-gaming-gray/20"
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-400">
                    {specialDates.length} special dates selected
                  </div>
                  <Button>Save Special Dates</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VenueAvailability;
