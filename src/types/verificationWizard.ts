
export interface VerificationWizardData {
    // Shared Step 1: Personal Information
    first_name: string;
    last_name: string;
    dob: string;
    contact_email: string;
    contact_phone: string;

    // Step 2: Business/Venue Information
    business_name: string; // Organization Name or Venue Name
    business_type: string; // Org Type or 'gaming_zone'
    business_description: string;
    business_address: string; // Specific to Venue, or optional for Org
    website: string;

    // Step 3: Experience / Specs
    // Organizer Specific
    organization_type: string;
    years_experience: number;
    expected_tournaments_per_month: number;
    staff_count: number;
    streaming_capabilities: boolean;
    previous_tournaments: string;
    prize_pool_experience: string;
    team_size_experience: string;
    equipment_available: string;
    social_media_links: {
        twitter: string;
        discord: string;
        instagram: string;
    };

    // Venue Specific
    venue_name: string; // Explicit field for venue name if different from business_name, but usually same
    total_pcs: number;
    pc_specs: string;
    operating_hours: string;
    hourly_rate: number;
    streaming_setup: boolean; // Similar to capabilities
    tournament_capability: boolean;

    // Step 4: Documents (Files are handled separately or via URLs if already uploaded?)
    // In the wizard, we might hold File objects in state until submission.
    // However, types usually hold serializable data. 
    // We'll keep file objects in local state of the container or a separate context, 
    // but for the data object passed to steps, maybe we just hold the previews or status?
    // Let's assume the container holds the File objects and we pass methods to update them.
    // Or we extend this interface to include `File | null` which is fine for React state but not for saving to DB directly.
    cnicFront: File | null;
    cnicBack: File | null;
    venueExterior: File | null;
    venueInterior: File | null;
    gamingArea: File | null;
}

export interface VerificationWizardStepProps {
    data: VerificationWizardData;
    updateData: (updates: Partial<VerificationWizardData>) => void;
    errors: Record<string, string>;
    role: 'organizer' | 'venue_owner';
}

export const DEFAULT_VERIFICATION_DATA: VerificationWizardData = {
    first_name: '',
    last_name: '',
    dob: '',
    contact_email: '',
    contact_phone: '',
    business_name: '',
    business_type: '',
    business_description: '',
    business_address: '',
    website: '',
    organization_type: '',
    years_experience: 0,
    expected_tournaments_per_month: 0,
    staff_count: 0,
    streaming_capabilities: false,
    previous_tournaments: '',
    prize_pool_experience: '',
    team_size_experience: '',
    equipment_available: '',
    social_media_links: {
        twitter: '',
        discord: '',
        instagram: ''
    },
    venue_name: '',
    total_pcs: 0,
    pc_specs: '',
    operating_hours: '',
    hourly_rate: 0,
    streaming_setup: false,
    tournament_capability: false,
    cnicFront: null,
    cnicBack: null,
    venueExterior: null,
    venueInterior: null,
    gamingArea: null,
};
