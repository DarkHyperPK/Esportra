import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Upload, AlertCircle, Info } from 'lucide-react';

interface VenueOwnerVerificationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const VenueOwnerVerificationForm: React.FC<VenueOwnerVerificationFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [venueExterior, setVenueExterior] = useState<File | null>(null);
  const [venueInterior, setVenueInterior] = useState<File | null>(null);
  const [gamingArea, setGamingArea] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    business_name: '',
    venue_name: '',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    business_description: '',
    total_pcs: 0,
    pc_specs: '',
    operating_hours: '',
    website: '',
    hourly_rate: 0,
    streaming_setup: false,
    tournament_capability: false
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }

    if (!cnicFront || !cnicBack || !venueExterior || !venueInterior || !gamingArea) {
      toast({ title: 'Error', description: 'Please upload all required images', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      const uploadFile = async (file: File, prefix: string) => {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${prefix}_${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('kyc-documents').upload(path, file, { upsert: true });
        if (error) throw error;
        return path;
      };

      const [cnicFrontPath, cnicBackPath, exteriorPath, interiorPath, gamingPath] = await Promise.all([
        uploadFile(cnicFront, 'cnic_front'),
        uploadFile(cnicBack, 'cnic_back'),
        uploadFile(venueExterior, 'venue_exterior'),
        uploadFile(venueInterior, 'venue_interior'),
        uploadFile(gamingArea, 'gaming_area')
      ]);

      const cnicFrontUrl = cnicFrontPath
        ? supabase.storage.from('kyc-documents').getPublicUrl(cnicFrontPath).data.publicUrl
        : null;
      const cnicBackUrl = cnicBackPath
        ? supabase.storage.from('kyc-documents').getPublicUrl(cnicBackPath).data.publicUrl
        : null;

      const payload: any = {
        user_id: user.id,
        requested_role: 'venue_owner',
        email: user.email || formData.contact_email,
        // Top-level fields required by DB
        business_type: 'gaming_zone',
        business_description: formData.business_description,
        date_of_birth: formData.dob,
        experience_description: formData.business_description || 'N/A',
        business_name: formData.business_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        cnic_front_url: cnicFrontUrl,
        cnic_back_url: cnicBackUrl,
        venue_data: {
          dob: formData.dob,
          business_description: formData.business_description,
          website: formData.website,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          business_address: formData.business_address,
          cnic_front_path: cnicFrontPath,
          cnic_back_path: cnicBackPath,
          venue_name: formData.venue_name,
          total_pcs: formData.total_pcs,
          pc_specs: formData.pc_specs,
          operating_hours: formData.operating_hours,
          hourly_rate: formData.hourly_rate,
          venue_images: {
            exterior: exteriorPath,
            interior: interiorPath,
            gaming_area: gamingPath
          },
          streaming_setup: formData.streaming_setup,
          tournament_capability: formData.tournament_capability
        }
      };

      let insertError: any | null = null;
      const insertRes = await supabase
        .from('verification_requests')
        .insert(payload)
        .select()
        .single();

      if (insertRes.error) insertError = insertRes.error;

      if (insertError && (insertError.code === '23505' || (insertError.message && insertError.message.toLowerCase().includes('unique')))) {
        const existing = await supabase
          .from('verification_requests')
          .select('id')
          .eq('user_id', user.id)
          .eq('requested_role', 'venue_owner')
          .eq('status', 'pending')
          .single();

        if (!existing.error && existing.data?.id) {
          const updateRes = await supabase
            .from('verification_requests')
            .update(payload)
            .eq('id', existing.data.id)
            .select()
            .single();

          if (updateRes.error) throw updateRes.error;
        } else {
          throw insertError;
        }
      } else if (insertError) {
        throw insertError;
      }

      toast({
        title: 'Success',
        description: 'Verification request submitted successfully',
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Building2 className="w-6 h-6 text-green-400" />
            Venue Owner Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">First Name *</Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300">Last Name *</Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Date of Birth *</Label>
              <Input
                type="date"
                value={formData.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">CNIC Front *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCnicFront(e.target.files?.[0] || null)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">CNIC Back *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCnicBack(e.target.files?.[0] || null)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Venue Name *</Label>
              <Input
                value={formData.venue_name}
                onChange={(e) => handleInputChange('venue_name', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Contact Email *</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Phone Number *</Label>
              <Input
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="+92 300 1234567"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Complete Address *</Label>
              <Textarea
                value={formData.business_address}
                onChange={(e) => handleInputChange('business_address', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Venue Description *</Label>
              <Textarea
                value={formData.business_description}
                onChange={(e) => handleInputChange('business_description', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

          <div>
            <Label className="text-gray-300">Website (optional)</Label>
            <Input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://your-venue.com"
            />
          </div>

            <div>
              <Label className="text-gray-300">Venue Exterior Photo *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setVenueExterior(e.target.files?.[0] || null)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Venue Interior Photo *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setVenueInterior(e.target.files?.[0] || null)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Gaming Area Photo *</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setGamingArea(e.target.files?.[0] || null)}
                className="bg-gray-700 border-gray-600 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Total PCs *</Label>
                <Input
                  type="number"
                  value={formData.total_pcs}
                  onChange={(e) => handleInputChange('total_pcs', parseInt(e.target.value) || 0)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300">Hourly Rate (PKR) *</Label>
                <Input
                  type="number"
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange('hourly_rate', parseInt(e.target.value) || 0)}
                  className="bg-gray-700 border-gray-600 text-white"
                  required
                />
              </div>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                id="streaming_setup"
                type="checkbox"
                checked={formData.streaming_setup}
                onChange={(e) => handleInputChange('streaming_setup', e.target.checked)}
              />
              <Label htmlFor="streaming_setup" className="text-gray-300">Streaming Setup</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tournament_capability"
                type="checkbox"
                checked={formData.tournament_capability}
                onChange={(e) => handleInputChange('tournament_capability', e.target.checked)}
              />
              <Label htmlFor="tournament_capability" className="text-gray-300">Tournament Capability</Label>
            </div>
          </div>

            <div>
              <Label className="text-gray-300">PC Specifications *</Label>
              <Textarea
                value={formData.pc_specs}
                onChange={(e) => handleInputChange('pc_specs', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Example: Intel i7-12700K, RTX 4070, 32GB DDR4, 1TB NVMe SSD"
                required
              />
            </div>

            <div>
              <Label className="text-gray-300">Operating Hours *</Label>
              <Input
                value={formData.operating_hours}
                onChange={(e) => handleInputChange('operating_hours', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., 9:00 AM - 2:00 AM (Daily)"
                required
              />
            </div>

            <Alert className="bg-blue-900/20 border-blue-500">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-blue-200">
                Your verification request will be reviewed within 24-48 hours.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueOwnerVerificationForm;

