import React from 'react';
import { Input } from '@/components/ui/input';

interface FormData {
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  maxParticipants: string;
  prizePool: string;
  entryFee: string;
  isOnline: boolean;
  description: string;
}

interface TournamentDetailsFormProps {
  formData: FormData;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TournamentDetailsForm = ({
  formData,
  onInputChange,
  onCheckboxChange
}: TournamentDetailsFormProps) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Prize Pool (PKR)</label>
          <Input 
            placeholder="e.g., 50000" 
            value={formData.prizePool}
            name="prizePool"
            onChange={onInputChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Entry Fee (PKR)</label>
          <Input 
            placeholder="Enter amount or type Free" 
            value={formData.entryFee}
            name="entryFee"
            onChange={onInputChange}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Tournament Description</label>
        <textarea 
          className="w-full h-32 px-3 py-2 text-white bg-esports-dark rounded-md border border-gaming-gray/30 focus:outline-none focus:ring-2 focus:ring-gaming-purple"
          placeholder="Enter tournament details, rules, and format"
          value={formData.description}
          name="description"
          onChange={onInputChange}
          required
        />
      </div>
    </>
  );
};

export default TournamentDetailsForm;
