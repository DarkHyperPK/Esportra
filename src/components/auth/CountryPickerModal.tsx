import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CountrySelector from '@/components/ui/CountrySelector';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { Globe } from 'lucide-react';

interface CountryPickerModalProps {
  onSave: () => void;
}

const CountryPickerModal = ({ onSave }: CountryPickerModalProps) => {
  const [selectedCode, setSelectedCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selectedCode) return;

    setIsSaving(true);
    setError(null);

    try {
      await apiClient.put('/api/profiles/me/country', { country_code: selectedCode });
      onSave();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save your country. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed left-[50%] top-[50%] z-[1001] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-none border border-white/10 bg-[#0a0a0c] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)] duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-400" />

          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20">
                <Globe className="h-5 w-5 text-rose-400" />
              </div>
              Select Your Country
            </DialogTitle>
            <DialogDescription>
              To complete your profile, please select your country. This is required to participate in region-specific tournaments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <CountrySelector value={selectedCode} onChange={setSelectedCode} />
            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="cta"
              onClick={handleSave}
              disabled={!selectedCode || isSaving}
            >
              {isSaving ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                  Saving...
                </>
              ) : 'Save Country'}
            </Button>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
};

export default CountryPickerModal;
