import React from 'react';
import { Input } from '@/components/ui/input';
import RichTextEditor from '@/components/ui/RichTextEditor';

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
  onCheckboxChange: _onCheckboxChange
}: TournamentDetailsFormProps) => {

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Prize Pool</label>
          <Input
            placeholder="e.g., 50000"
            value={formData.prizePool}
            name="prizePool"
            onChange={onInputChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Entry Fee</label>
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
        <RichTextEditor
          content={formData.description || ''}
          onChange={(content) => onInputChange({
            target: { name: 'description', value: content }
          } as React.ChangeEvent<HTMLTextAreaElement>)}
          minHeight="128px"
        />
      </div>
    </>
  );
};

export default TournamentDetailsForm;
