import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Upload, AlertCircle, CheckCircle, X, Trophy, Users, Calendar, Globe, Mail, Phone, MapPin } from 'lucide-react';

interface OrganizerVerificationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const OrganizerVerificationForm: React.FC<OrganizerVerificationFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [cnicFrontPreview, setCnicFrontPreview] = useState<string | null>(null);
  const [cnicBackPreview, setCnicBackPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dob: '',
    business_name: '',
    business_type: '',
    business_description: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    social_media_links: {
      twitter: '',
      discord: '',
      instagram: ''
    },
    previous_experience: '',
    expected_tournaments_per_month: 0,
    // Organizer specific fields
    organization_type: '',
    years_experience: 0,
    previous_tournaments: '',
    prize_pool_experience: '',
    team_size_experience: '',
    streaming_capabilities: false,
    equipment_available: '',
    staff_count: 0
  });

  const organizationTypes = [
    { value: 'esports_organization', label: 'Esports Organization' },
    { value: 'tournament_organizer', label: 'Tournament Organizer' },
    { value: 'gaming_community', label: 'Gaming Community' },
    { value: 'esports_team', label: 'Esports Team' },
    { value: 'gaming_company', label: 'Gaming Company' },
    { value: 'event_management', label: 'Event Management Company' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleFileChange = (file: File | null, type: 'front' | 'back') => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'front') {
          setCnicFront(file);
          setCnicFrontPreview(e.target?.result as string);
        } else {
          setCnicBack(file);
          setCnicBackPreview(e.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to submit verification', variant: 'destructive' });
      return;
    }

    if (!cnicFront || !cnicBack) {
      toast({ title: 'Error', description: 'Please upload both CNIC front and back images', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      // Upload CNIC documents
      let cnicFrontUrl: string | null = null;
      let cnicBackUrl: string | null = null;

      if (cnicFront) {
        const fd = new FormData();
        fd.append('file', cnicFront);
        fd.append('bucket', 'users.documents.kyc');
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        cnicFrontUrl = url;
      }

      if (cnicBack) {
        const fd = new FormData();
        fd.append('file', cnicBack);
        fd.append('bucket', 'users.documents.kyc');
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        cnicBackUrl = url;
      }

      // Build robust payload matching enforced columns
      const payload: any = {
        user_id: user.id,
        requested_role: 'organizer',
        email: user.email || formData.contact_email,
        business_name: formData.business_name,
        business_type: formData.business_type,
        business_description: formData.business_description,
        experience_description: formData.previous_experience || '',
        date_of_birth: formData.dob,
        cnic_front_url: cnicFrontUrl,
        cnic_back_url: cnicBackUrl,
        // optional top-level fields (kept if they exist in schema)
        first_name: formData.first_name,
        last_name: formData.last_name,
        // bucket all extended fields into organizer_data JSON
        organizer_data: {
          dob: formData.dob,
          cnic_front_path: cnicFrontPath,
          cnic_back_path: cnicBackPath,
          website: formData.website || null,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          business_address: formData.business_address || null,
          social_media_links: formData.social_media_links,
          expected_tournaments_per_month: formData.expected_tournaments_per_month,
          organization_type: formData.organization_type,
          years_experience: formData.years_experience,
          previous_tournaments: formData.previous_tournaments,
          prize_pool_experience: formData.prize_pool_experience,
          team_size_experience: formData.team_size_experience,
          streaming_capabilities: formData.streaming_capabilities,
          equipment_available: formData.equipment_available,
          staff_count: formData.staff_count
        }
      };

      // Try insert; on unique violation for pending request, update instead
      let insertError: any | null = null;
      try {
        await apiClient.post('/api/profiles/me/verification-requests', payload);
      } catch (err: any) {
        insertError = err;
      }

      if (insertError && (insertError.status === 409 || (insertError.body && typeof insertError.body === 'object' && (insertError.body as any)?.code === '23505'))) {
        try {
          await apiClient.put('/api/profiles/me/verification-requests/organizer', payload);
        } catch (updateErr: any) {
          throw updateErr;
        }
      } else if (insertError) {
        throw insertError;
      }

      toast({
        title: 'Verification Request Submitted',
        description: 'Your organizer verification request has been submitted successfully. We will review it within 24-48 hours.',
        variant: 'default',
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error submitting verification request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit verification request. Please try again.',
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
            <Trophy className="w-6 h-6 text-purple-400" />
            Organizer Verification Request
          </CardTitle>
          <p className="text-gray-400">
            Apply to become a verified tournament organizer and host events on our platform.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name" className="text-gray-300">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name" className="text-gray-300">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dob" className="text-gray-300">Date of Birth *</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone" className="text-gray-300">Phone Number</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>
            </div>

            {/* CNIC Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Identity Verification
              </h3>
              <Alert className="bg-blue-900/20 border-blue-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-blue-200">
                  Please upload clear, high-quality images of your CNIC front and back for verification.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">CNIC Front *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'front')}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  {cnicFrontPreview && (
                    <div className="mt-2">
                      <img src={cnicFrontPreview} alt="CNIC Front Preview" className="w-32 h-20 object-cover rounded border" />
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-gray-300">CNIC Back *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'back')}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                  {cnicBackPreview && (
                    <div className="mt-2">
                      <img src={cnicBackPreview} alt="CNIC Back Preview" className="w-32 h-20 object-cover rounded border" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Organization Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Organization Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name" className="text-gray-300">Organization Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleInputChange('business_name', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your organization name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="organization_type" className="text-gray-300">Organization Type *</Label>
                  <Select value={formData.organization_type} onValueChange={(value) => handleInputChange('organization_type', value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select organization type" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="contact_email" className="text-gray-300">Contact Email *</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="contact@yourorg.com"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="website" className="text-gray-300">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="https://yourorg.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="business_description" className="text-gray-300">Organization Description *</Label>
                <Textarea
                  id="business_description"
                  value={formData.business_description}
                  onChange={(e) => handleInputChange('business_description', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Describe your organization, its mission, and what makes it unique..."
                  rows={4}
                  required
                />
              </div>
            </div>

            {/* Tournament Experience */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Tournament Experience
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="years_experience" className="text-gray-300">Years of Experience *</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    min="0"
                    value={formData.years_experience}
                    onChange={(e) => handleInputChange('years_experience', parseInt(e.target.value) || 0)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expected_tournaments_per_month" className="text-gray-300">Expected Tournaments/Month *</Label>
                  <Input
                    id="expected_tournaments_per_month"
                    type="number"
                    min="0"
                    value={formData.expected_tournaments_per_month}
                    onChange={(e) => handleInputChange('expected_tournaments_per_month', parseInt(e.target.value) || 0)}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="staff_count" className="text-gray-300">Staff Count</Label>
                  <Input
                    id="staff_count"
                    type="number"
                    min="0"
                    value={formData.staff_count}
                    onChange={(e) => handleInputChange('staff_count', parseInt(e.target.value) || 0)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="streaming_capabilities"
                    checked={formData.streaming_capabilities}
                    onChange={(e) => handleInputChange('streaming_capabilities', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="streaming_capabilities" className="text-gray-300">Have Streaming Capabilities</Label>
                </div>
              </div>
              <div>
                <Label htmlFor="previous_tournaments" className="text-gray-300">Previous Tournaments Organized</Label>
                <Textarea
                  id="previous_tournaments"
                  value={formData.previous_tournaments}
                  onChange={(e) => handleInputChange('previous_tournaments', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="List any previous tournaments you've organized, including game titles, participant counts, and prize pools..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="prize_pool_experience" className="text-gray-300">Prize Pool Experience</Label>
                <Input
                  id="prize_pool_experience"
                  value={formData.prize_pool_experience}
                  onChange={(e) => handleInputChange('prize_pool_experience', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., $1,000 - $10,000"
                />
              </div>
              <div>
                <Label htmlFor="team_size_experience" className="text-gray-300">Team Size Experience</Label>
                <Input
                  id="team_size_experience"
                  value={formData.team_size_experience}
                  onChange={(e) => handleInputChange('team_size_experience', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="e.g., 16 teams, 32 teams, 64 teams"
                />
              </div>
              <div>
                <Label htmlFor="equipment_available" className="text-gray-300">Equipment Available</Label>
                <Textarea
                  id="equipment_available"
                  value={formData.equipment_available}
                  onChange={(e) => handleInputChange('equipment_available', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Describe any equipment you have for tournaments (streaming setup, servers, etc.)..."
                  rows={2}
                />
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Social Media & Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="twitter" className="text-gray-300">Twitter Handle</Label>
                  <Input
                    id="twitter"
                    value={formData.social_media_links.twitter}
                    onChange={(e) => handleInputChange('social_media_links.twitter', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label htmlFor="discord" className="text-gray-300">Discord Server</Label>
                  <Input
                    id="discord"
                    value={formData.social_media_links.discord}
                    onChange={(e) => handleInputChange('social_media_links.discord', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Discord invite link"
                  />
                </div>
                <div>
                  <Label htmlFor="instagram" className="text-gray-300">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.social_media_links.instagram}
                    onChange={(e) => handleInputChange('social_media_links.instagram', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="@yourhandle"
                  />
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {submitting ? 'Submitting...' : 'Submit Verification Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerVerificationForm;
