
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, User } from 'lucide-react';

interface RegistrationTypeSelectorProps {
  registrationType: 'solo' | 'team';
  onValueChange: (value: 'solo' | 'team') => void;
}

const RegistrationTypeSelector = ({
  registrationType,
  onValueChange,
}: RegistrationTypeSelectorProps) => {
  return (
    <RadioGroup
      value={registrationType}
      onValueChange={onValueChange}
      className="grid grid-cols-2 gap-4"
    >
      <div>
        <RadioGroupItem
          value="solo"
          id="solo"
          className="peer sr-only"
        />
        <Label
          htmlFor="solo"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-gaming-gray/20 p-4 hover:bg-gaming-gray/30 [&:has([data-state=checked])]:border-gaming-purple"
        >
          <User className="mb-2 h-6 w-6" />
          Solo Player
        </Label>
      </div>
      <div>
        <RadioGroupItem
          value="team"
          id="team"
          className="peer sr-only"
        />
        <Label
          htmlFor="team"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-gaming-gray/20 p-4 hover:bg-gaming-gray/30 [&:has([data-state=checked])]:border-gaming-purple"
        >
          <Users className="mb-2 h-6 w-6" />
          Team
        </Label>
      </div>
    </RadioGroup>
  );
};

export default RegistrationTypeSelector;
