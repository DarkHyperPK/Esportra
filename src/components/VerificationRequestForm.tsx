import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Building2, Trophy, MapPin, AlertCircle, CheckCircle, X } from 'lucide-react';
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
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<'organizer' | 'venue_owner' | null>(
    requestedRole || null
  );

  // Determine which role to request verification for
  const getRequestedRole = (): 'organizer' | 'venue_owner' => {
    if (requestedRole) {
      return requestedRole;
    }
    if (currentRole === 'casual') {
      // Casual users can request organizer verification by default
      return 'organizer';
    }
    // For other roles, default to organizer
    return 'organizer';
  };

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
      <Card className="w-full max-w-4xl mx-auto bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building2 className="w-5 h-5" />
            Request Verification
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Choose the type of verification you need to access specialized features on our platform.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Organizer Option */}
            <Card
              className="bg-gray-700/50 border-gray-600 hover:border-purple-500 cursor-pointer transition-all duration-200 hover:bg-gray-700/70"
              onClick={() => handleRoleSelect('organizer')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className="w-8 h-8 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">Tournament Organizer</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Create and manage tournaments, verify results, and organize gaming events for the community.
                </p>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Create tournaments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Manage participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Verify results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Set prize pools</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    Apply as Organizer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Venue Owner Option */}
            <Card
              className="bg-gray-700/50 border-gray-600 hover:border-green-500 cursor-pointer transition-all duration-200 hover:bg-gray-700/70"
              onClick={() => handleRoleSelect('venue_owner')}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="w-8 h-8 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">Gaming Zone Owner</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  List your gaming zone, manage bookings, and provide gaming spaces for tournaments and events.
                </p>
                <div className="space-y-2 text-sm text-gray-400">
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
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    Apply as Venue Owner
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="mt-6 bg-blue-900/20 border-blue-700">
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
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
        { /* Title Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">
            {selectedRole === 'organizer' ? 'Organizer Verification' : 'Venue Verification'}
          </h1>
          <p className="text-gray-400">Complete the steps below to verify your account.</p>
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
