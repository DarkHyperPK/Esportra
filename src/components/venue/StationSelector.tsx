
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface StationSelectorProps {
  stations: number;
  availableStations: number;
  onStationsChange: (value: number) => void;
}

const StationSelector: React.FC<StationSelectorProps> = ({
  stations,
  availableStations,
  onStationsChange
}) => {
  const handleValueChange = (value: number[]) => {
    onStationsChange(value[0]);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>Number of Gaming Stations</Label>
        <span className="text-sm text-gaming-purple">{stations} of {availableStations}</span>
      </div>
      <Slider
        value={[stations]}
        max={availableStations}
        min={1}
        step={1}
        onValueChange={handleValueChange}
        className="cursor-pointer"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>1 station</span>
        <span>{availableStations} stations</span>
      </div>
    </div>
  );
};

export default StationSelector;
