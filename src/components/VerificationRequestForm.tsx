import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Trophy, MapPin, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import VerificationWizard from './verification/wizard/VerificationWizard';
// import OrganizerVerificationForm from './verification/OrganizerVerificationForm';
// import VenueOwnerVerificationForm from './verification/VenueOwnerVerificationForm';

interface VerificationRequestFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  requestedRole?: 'organizer' | 'venue_owner';
}

const VerificationRequestForm: React.FC<VerificationRequestFormProps> = ({
  onSuccess,
  onCancel,
  requestedRole
}) => {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<'organizer' | 'venue_owner' | null>(
    requestedRole || null
  );

  const handleRoleSelect = (role: 'organizer' | 'venue_owner') => {
    setSelectedRole(role);
  };

  const handleSuccess = () => {
    toast({
      title: 'Verification Request Submitted',
      description: 'Your verification request has been submitted successfully. We will review it within 24-48 hours.',
      variant: 'default',
    });
    onSuccess?.();
  };

  const handleCancel = () => {
    setSelectedRole(null);
    onCancel?.();
  };

  // If no role selected, show role selection
  if (!selectedRole) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-[#0a0a0c] border-white/10 rounded-3xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            Choose License Type
          </CardTitle>
          <p className="text-zinc-400 text-sm">
            Select the license you want to apply for to unlock platform features.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organizer Option */}
            <Card
              className="bg-gradient-to-br from-[#121214] to-[#18181b] border-white/10 hover:border-rose-500/30 cursor-pointer transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleRoleSelect('organizer')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="w-8 h-8 text-rose-400" />
                  <h3 className="text-xl font-semibold text-white">Tournament Organizer</h3>
                </div>
                <p className="text-zinc-300 mb-4">
                  Create and manage tournaments, verify results, and organize gaming events for the community.
                </p>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Create tournaments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Manage participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Verify results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Set prize pools</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Button className="w-full bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-lg shadow-rose-500/20">
                    Apply as Organizer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Venue Owner Option */}
            <Card
              className="bg-gradient-to-br from-[#121214] to-[#18181b] border-white/10 hover:border-emerald-500/30 cursor-pointer transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleRoleSelect('venue_owner')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-8 h-8 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Gaming Zone Owner</h3>
                </div>
                <p className="text-zinc-300 mb-4">
                  List your gaming zone, manage bookings, and provide gaming spaces for tournaments and events.
                </p>
                <div className="space-y-2 text-sm text-zinc-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>List gaming zones</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Manage bookings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Host tournaments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Earn from bookings</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Button className="w-full bg-white text-black hover:bg-white/90 font-mono text-xs font-bold uppercase tracking-wider">
                    Apply as Venue Owner
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="mt-6 bg-blue-900/15 border-blue-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-blue-300">
              <strong>Important:</strong> Verification requests are reviewed by our admin team.
              You will be notified via email once your request is processed. This process typically takes 1-3 business days.
              <br /><br />
              <strong>For Venue Owners:</strong> You'll need to provide detailed information about your gaming zone,
              including PC specifications, amenities, and venue photos for verification.
            </AlertDescription>
          </Alert>

          {onCancel && (
            <div className="flex justify-end mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render the appropriate specialized form (NOW USING WIZARD)
  if (selectedRole === 'organizer' || selectedRole === 'venue_owner') {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0f0f12] p-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verification Wizard
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">
            {selectedRole === 'organizer' ? 'Organizer Verification' : 'Venue Verification'}
            </h1>
            <p className="text-zinc-400">Complete the steps below to verify your account.</p>
          </div>
          {!requestedRole && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedRole(null)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change Type
            </Button>
          )}
        </div>

        <VerificationWizard
          role={selectedRole}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return null;
};

export default VerificationRequestForm;
