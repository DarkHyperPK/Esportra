import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import WizardProgress from '@/components/tournament/wizard/WizardProgress';
import StepPersonalDetails from './StepPersonalDetails';
import StepBusinessInfo from './StepBusinessInfo';
import StepExperience from './StepExperience';
import StepDocuments from './StepDocuments';
import { VerificationWizardData, DEFAULT_VERIFICATION_DATA } from '@/types/verificationWizard';
import { ORGANIZER_STEPS, VENUE_OWNER_STEPS } from './VerificationSteps';

interface VerificationWizardProps {
    role: 'organizer' | 'venue_owner';
    onSuccess?: () => void;
    onCancel?: () => void;
}

const VerificationWizard: React.FC<VerificationWizardProps> = ({ role, onSuccess, onCancel }) => {
    const { user } = useAuth();
    const { toast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [data, setData] = useState<VerificationWizardData>(DEFAULT_VERIFICATION_DATA);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const STEPS = role === 'organizer' ? ORGANIZER_STEPS : VENUE_OWNER_STEPS;
    const isLastStep = currentStep === STEPS.length;

    // Helper to update form data
    const updateData = (updates: Partial<VerificationWizardData>) => {
        setData(prev => ({ ...prev, ...updates }));
        // Clear errors for fields being updated
        const newErrors = { ...errors };
        Object.keys(updates).forEach(key => delete newErrors[key]);
        setErrors(newErrors);
    };

    // Validation Logic
    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        if (step === 1) { // Personal Details
            if (!data.first_name) newErrors.first_name = 'First Name is required';
            if (!data.last_name) newErrors.last_name = 'Last Name is required';
            if (!data.dob) newErrors.dob = 'Date of Birth is required';
            if (!data.contact_phone) newErrors.contact_phone = 'Phone Number is required';
            if (!data.contact_email) newErrors.contact_email = 'Email is required';
        }

        if (step === 2) { // Business Info
            if (!data.business_name && !data.venue_name) newErrors.business_name = 'Name is required';
            if (role === 'organizer' && !data.organization_type) newErrors.organization_type = 'Type is required';
            if (role === 'venue_owner') {
                if (!data.operating_hours) newErrors.operating_hours = 'Operating Hours required';
                if (!data.business_address) newErrors.business_address = 'Address required';
            }
            if (!data.business_description) newErrors.business_description = 'Description is required';
        }

        if (step === 3) { // Experience or Specs
            if (role === 'organizer') {
                if (!data.years_experience && data.years_experience !== 0) newErrors.years_experience = 'Required';
                if (!data.expected_tournaments_per_month && data.expected_tournaments_per_month !== 0) newErrors.expected_tournaments_per_month = 'Required';
            }
            if (role === 'venue_owner') {
                if (!data.total_pcs) newErrors.total_pcs = 'Required';
                if (!data.hourly_rate) newErrors.hourly_rate = 'Required';
                if (!data.pc_specs) newErrors.pc_specs = 'Required';
                if (!data.venueExterior) newErrors.venueExterior = 'Required';
                if (!data.venueInterior) newErrors.venueInterior = 'Required';
                if (!data.gamingArea) newErrors.gamingArea = 'Required';
            }
        }

        if (step === 4) { // Documents
            if (!data.cnicFront) newErrors.cnicFront = 'Front image required';
            if (!data.cnicBack) newErrors.cnicBack = 'Back image required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }

        // Update validation state
        setStepValidation(prev => ({ ...prev, [step]: isValid }));
        return isValid;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
            window.scrollTo(0, 0);
        } else {
            toast({
                title: "Validation Error",
                description: "Please fix the errors before proceeding.",
                variant: "destructive"
            });
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo(0, 0);
    };

    const uploadFile = async (file: File | null, prefix: string): Promise<string | null> => {
        if (!file || !user) return null;
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `${user.id}/${prefix}_${Date.now()}.${ext}`;
            const { error } = await supabase.storage.from('users.documents.kyc').upload(path, file, { upsert: true });
            if (error) throw error;
            return path;
        } catch (err) {
            console.error('Upload failed:', err);
            return null;
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;
        if (!user) {
            toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload ALL files sequentially
            // Check step 3 files for venue owner first
            let exteriorPath: string | null = null;
            let interiorPath: string | null = null;
            let gamingPath: string | null = null;

            if (role === 'venue_owner') {
                exteriorPath = await uploadFile(data.venueExterior, 'venue_exterior');
                interiorPath = await uploadFile(data.venueInterior, 'venue_interior');
                gamingPath = await uploadFile(data.gamingArea, 'gaming_area');
            }

            const cnicFrontPath = await uploadFile(data.cnicFront, 'cnic_front');
            const cnicBackPath = await uploadFile(data.cnicBack, 'cnic_back');

            // Get Public URLs
            const getUrl = (path: string | null) => path ? supabase.storage.from('users.documents.kyc').getPublicUrl(path).data.publicUrl : null;

            const payload: any = {
                user_id: user.id,
                requested_role: role,
                email: user.email || data.contact_email,
                first_name: data.first_name,
                last_name: data.last_name,
                date_of_birth: data.dob,
                business_name: role === 'venue_owner' ? (data.venue_name || data.business_name) : data.business_name,
                business_type: role === 'venue_owner' ? 'gaming_zone' : data.business_type,
                business_description: data.business_description,
                experience_description: role === 'organizer' ? (data.previous_tournaments || 'N/A') : (data.business_description || 'N/A'),
                cnic_front_url: getUrl(cnicFrontPath),
                cnic_back_url: getUrl(cnicBackPath),
            };

            // Extended JSON Data
            if (role === 'organizer') {
                payload.organizer_data = {
                    dob: data.dob,
                    cnic_front_path: cnicFrontPath,
                    cnic_back_path: cnicBackPath,
                    website: data.website || null,
                    contact_email: data.contact_email,
                    contact_phone: data.contact_phone,
                    // Organizer specific
                    organization_type: data.organization_type,
                    years_experience: data.years_experience,
                    previous_tournaments: data.previous_tournaments,
                    expected_tournaments_per_month: data.expected_tournaments_per_month,
                    social_media_links: data.social_media_links,
                };
            } else {
                payload.venue_data = {
                    dob: data.dob,
                    cnic_front_path: cnicFrontPath,
                    cnic_back_path: cnicBackPath,
                    website: data.website || null,
                    contact_email: data.contact_email,
                    contact_phone: data.contact_phone,
                    business_address: data.business_address,
                    // Venue specific
                    venue_name: data.venue_name,
                    total_pcs: data.total_pcs,
                    pc_specs: data.pc_specs,
                    operating_hours: data.operating_hours,
                    hourly_rate: data.hourly_rate,
                    streaming_setup: data.streaming_setup,
                    tournament_capability: data.tournament_capability,
                    venue_images: {
                        exterior: exteriorPath,
                        interior: interiorPath,
                        gaming_area: gamingPath
                    }
                };
            }

            // Database Insert/Update via API (backend handles upsert logic)
            await apiClient.post('/api/profiles/me/verification', payload);

            toast({
                title: 'Success!',
                description: 'Your verification request has been submitted.',
                variant: 'default'
            });

            if (onSuccess) onSuccess();

        } catch (error) {
            console.error('Submission error:', error);
            toast({ title: 'Error', description: 'Failed to submit verification request.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepPersonalDetails data={data} updateData={updateData} errors={errors} role={role} />;
            case 2:
                return <StepBusinessInfo data={data} updateData={updateData} errors={errors} role={role} />;
            case 3:
                return <StepExperience data={data} updateData={updateData} errors={errors} role={role} />;
            case 4:
                return <StepDocuments data={data} updateData={updateData} errors={errors} role={role} />;
            default: return null;
        }
    };

    return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 relative overflow-hidden">
            {/* Progress */}
            <WizardProgress
                currentStep={currentStep}
                stepValidation={stepValidation}
                onStepClick={(step) => {
                    // Only allow going back or to completed steps
                    if (step < currentStep || stepValidation[step]) setCurrentStep(step);
                }}
                steps={STEPS}
            />

            <AnimatePresence mode="wait">
                {renderStep()}
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                    {currentStep > 1 ? (
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            className="border-gray-700 bg-black/20 hover:bg-white/10 text-white"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                    ) : (
                        onCancel && (
                            <Button
                                variant="ghost"
                                onClick={onCancel}
                                className="text-gray-400 hover:text-white"
                            >
                                Cancel
                            </Button>
                        )
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {isLastStep ? (
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-emerald-500 hover:bg-emerald-600 min-w-[160px] text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    Submit Request
                                    <Save className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                        >
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerificationWizard;
