import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, List } from 'lucide-react';

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
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onInputChange({
        target: { name: 'description', value: editorRef.current.innerHTML }
      } as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      onInputChange({
        target: { name: 'description', value: editorRef.current.innerHTML }
      } as React.ChangeEvent<HTMLTextAreaElement>);
    }
  };

  // Initialize editor content when formData.description changes from outside
  useEffect(() => {
    if (editorRef.current && formData.description !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = formData.description || '';
    }
  }, [formData.description]);

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
        <div className="border border-gaming-gray/30 rounded-md overflow-hidden">
          <div className="flex items-center gap-1 p-2 bg-esports-dark border-b border-gaming-gray/30">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => execCommand('bold')}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => execCommand('italic')}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => execCommand('formatBlock', 'H1')}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => execCommand('formatBlock', 'H2')}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => execCommand('insertUnorderedList')}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <div
            ref={editorRef}
            contentEditable
            className="w-full h-32 px-3 py-2 text-white bg-esports-dark focus:outline-none min-h-[128px]"
            onInput={handleEditorChange}
            dangerouslySetInnerHTML={{ __html: formData.description || '' }}
          />
        </div>
      </div>
    </>
  );
};

export default TournamentDetailsForm;
