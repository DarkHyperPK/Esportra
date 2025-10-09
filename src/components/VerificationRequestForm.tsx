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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { Building2, Upload, AlertCircle, CheckCircle, X } from 'lucide-react';

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
  const [submitting, setSubmitting] = useState(false);
  const [cnicFront, setCnicFront] = useState<File | null>(null);
  const [cnicBack, setCnicBack] = useState<File | null>(null);
  const [cnicFrontPreview, setCnicFrontPreview] = useState<string | null>(null);
  const [cnicBackPreview, setCnicBackPreview] = useState<string | null>(null);
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

  const [formData, setFormData] = useState({
    requested_role: getRequestedRole(),
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
    expected_tournaments_per_month: 0
  });

  const businessTypes = [
    { value: 'esports_organization', label: 'Esports Organization' },
    { value: 'gaming_venue', label: 'Gaming Venue/Cafe' },
    { value: 'tournament_organizer', label: 'Tournament Organizer' },
    { value: 'gaming_community', label: 'Gaming Community' },
    { value: 'esports_team', label: 'Esports Team' },
    { value: 'gaming_company', label: 'Gaming Company' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialMediaChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      social_media_links: {
        ...prev.social_media_links,
        [platform]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a verification request',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.requested_role || !formData.first_name || !formData.last_name || !formData.dob || !formData.contact_email || !formData.business_type || !formData.business_description) {
      toast({
        title: 'Error',
        description: 'Please complete all required fields',
        variant: 'destructive',
      });
      return;
    }

    // CNIC required for organizer MVP
    if (formData.requested_role === 'organizer' && (!cnicFront || !cnicBack)) {
      toast({ title: 'CNIC required', description: 'Please upload both front and back CNIC images.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      // If CNIC provided, upload to private bucket 'kyc'
      let cnicFrontPath: string | null = null;
      let cnicBackPath: string | null = null;
      if (cnicFront) {
        const ext = cnicFront.name.split('.').pop() || 'jpg';
        const path = `${user.id}/cnic_front_${Date.now()}.${ext}`;
        const up = await supabase.storage.from('kyc').upload(path, cnicFront, { upsert: true, contentType: cnicFront.type });
        if (up.error) throw up.error;
        cnicFrontPath = path;
      }
      if (cnicBack) {
        const ext = cnicBack.name.split('.').pop() || 'jpg';
        const path = `${user.id}/cnic_back_${Date.now()}.${ext}`;
        const up = await supabase.storage.from('kyc').upload(path, cnicBack, { upsert: true, contentType: cnicBack.type });
        if (up.error) throw up.error;
        cnicBackPath = path;
      }

      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          requested_role: formData.requested_role,
          first_name: formData.first_name,
          last_name: formData.last_name,
          dob: formData.dob,
          business_name: formData.business_name,
          business_type: formData.business_type,
          business_description: formData.business_description,
          website: formData.website || null,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          business_address: formData.business_address || null,
          social_media_links: formData.social_media_links,
          previous_experience: formData.previous_experience || null,
          expected_tournaments_per_month: formData.expected_tournaments_per_month,
          cnic_front_path: cnicFrontPath,
          cnic_back_path: cnicBackPath
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Verification Request Submitted',
        description: 'Your request has been submitted for review. You will be notified once it\'s processed.',
        variant: 'default',
      });

      onSuccess?.();

    } catch (error) {
      console.error('Error submitting verification request:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit verification request. The verification system may not be set up yet. Please contact an administrator.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-gray-800/50 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Building2 className="w-5 h-5" />
          Request Verification
        </CardTitle>
        <p className="text-gray-400 text-sm">
          Submit your business information to get verified and access organizer or venue owner features.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role Display (Read-only) */}
          <div className="space-y-2">
            <Label className="text-white">Requesting Verification For</Label>
            <div className="p-3 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium capitalize">
                  {formData.requested_role.replace('_', ' ')}
                </span>
                <Badge className="bg-blue-600 text-white text-xs">
                  Verification Required
                </Badge>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {formData.requested_role === 'organizer' 
                  ? 'Create and manage tournaments, verify results, and organize gaming events.'
                  : 'List and manage gaming venues, host tournaments, and provide gaming spaces.'
                }
              </p>
            </div>
          </div>

          {/* Personal Information (Organizer MVP) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-white">First Name *</Label>
              <Input id="first_name" value={formData.first_name} onChange={(e)=>handleInputChange('first_name', e.target.value)} className="bg-gray-700 border-gray-600 text-white" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-white">Last Name *</Label>
              <Input id="last_name" value={formData.last_name} onChange={(e)=>handleInputChange('last_name', e.target.value)} className="bg-gray-700 border-gray-600 text-white" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email" className="text-white">Email Address *</Label>
              <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e)=>handleInputChange('contact_email', e.target.value)} className="bg-gray-700 border-gray-600 text-white" placeholder="business@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob" className="text-white">Date of Birth *</Label>
              <Input id="dob" type="date" value={formData.dob} onChange={(e)=>handleInputChange('dob', e.target.value)} className="bg-gray-700 border-gray-600 text-white" required />
            </div>
          </div>

          {/* CNIC Upload (Organizer) */}
          {formData.requested_role === 'organizer' && (
            <div className="space-y-3">
              <div>
                <Label className="text-white">CNIC Front *</Label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-600 text-gray-200 hover:bg-gray-700">
                    <Upload className="w-4 h-4" />
                    <span>{cnicFront ? 'Replace file' : 'Upload CNIC front'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]||null; setCnicFront(f); setCnicFrontPreview(f?URL.createObjectURL(f):null); }} />
                  </label>
                  {cnicFront && (
                    <Button type="button" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={()=>{ setCnicFront(null); setCnicFrontPreview(null); }}>
                      <X className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                {cnicFrontPreview && (<img src={cnicFrontPreview} alt="CNIC front" className="mt-2 max-h-40 rounded border border-gray-700" />)}
              </div>
              <div>
                <Label className="text-white">CNIC Back *</Label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded border border-gray-600 text-gray-200 hover:bg-gray-700">
                    <Upload className="w-4 h-4" />
                    <span>{cnicBack ? 'Replace file' : 'Upload CNIC back'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]||null; setCnicBack(f); setCnicBackPreview(f?URL.createObjectURL(f):null); }} />
                  </label>
                  {cnicBack && (
                    <Button type="button" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700" onClick={()=>{ setCnicBack(null); setCnicBackPreview(null); }}>
                      <X className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                {cnicBackPreview && (<img src={cnicBackPreview} alt="CNIC back" className="mt-2 max-h-40 rounded border border-gray-700" />)}
              </div>
              <p className="text-xs text-gray-400">Upload clear photos of CNIC front and back. JPG/PNG up to 10 MB each.</p>
            </div>
          )}

          {/* Business Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name" className="text-white">Business/Organization Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Enter your business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business_type" className="text-white">Business Type *</Label>
              <Select value={formData.business_type} onValueChange={(value) => handleInputChange('business_type', value)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business Description */}
          <div className="space-y-2">
            <Label htmlFor="business_description" className="text-white">Business Description *</Label>
            <Textarea
              id="business_description"
              value={formData.business_description}
              onChange={(e) => handleInputChange('business_description', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Describe your business, what you do, and why you want to be verified"
              rows={4}
              required
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contact_phone" className="text-white">Phone</Label>
            <Input id="contact_phone" value={formData.contact_phone} onChange={(e)=>handleInputChange('contact_phone', e.target.value)} className="bg-gray-700 border-gray-600 text-white" placeholder="+1 (555) 123-4567" />
          </div>

          {/* Website and Address */}
          <div className="space-y-2">
            <Label htmlFor="website" className="text-white">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_address" className="text-white">Business Address</Label>
            <Textarea
              id="business_address"
              value={formData.business_address}
              onChange={(e) => handleInputChange('business_address', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter your business address (optional)"
              rows={2}
            />
          </div>

          {/* Social Media Links */}
          <div className="space-y-4">
            <Label className="text-white">Social Media Links</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twitter" className="text-gray-400 text-sm">Twitter</Label>
                <Input
                  id="twitter"
                  value={formData.social_media_links.twitter}
                  onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="@username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discord" className="text-gray-400 text-sm">Discord</Label>
                <Input
                  id="discord"
                  value={formData.social_media_links.discord}
                  onChange={(e) => handleSocialMediaChange('discord', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Server invite link"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-gray-400 text-sm">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.social_media_links.instagram}
                  onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="@username"
                />
              </div>
            </div>
          </div>

          {/* Experience and Expectations */}
          <div className="space-y-2">
            <Label htmlFor="previous_experience" className="text-white">Previous Experience</Label>
            <Textarea
              id="previous_experience"
              value={formData.previous_experience}
              onChange={(e) => handleInputChange('previous_experience', e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Describe your previous experience organizing tournaments or managing venues"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected_tournaments" className="text-white">Expected Tournaments per Month</Label>
            <Input
              id="expected_tournaments"
              type="number"
              min="0"
              value={formData.expected_tournaments_per_month}
              onChange={(e) => handleInputChange('expected_tournaments_per_month', parseInt(e.target.value) || 0)}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="0"
            />
          </div>

          {/* Information Alert */}
          <Alert className="bg-blue-900/20 border-blue-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-blue-300">
              Verification requests are reviewed by our admin team. You will be notified via email once your request is processed. 
              This process typically takes 1-3 business days.
            </AlertDescription>
          </Alert>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default VerificationRequestForm;
