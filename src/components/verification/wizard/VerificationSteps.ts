
import { WizardStepConfig } from '@/components/tournament/wizard/WizardProgress';

export const ORGANIZER_STEPS: WizardStepConfig[] = [
    { id: 1, title: 'Personal Details', description: 'Your basic information' },
    { id: 2, title: 'Organization Info', description: 'Tell us about your org' },
    { id: 3, title: 'Experience', description: 'Your track record' },
    { id: 4, title: 'Documents', description: 'Verify identity' },
    { id: 5, title: 'License Terms', description: 'Accept policy' },
];

export const VENUE_OWNER_STEPS: WizardStepConfig[] = [
    { id: 1, title: 'Personal Details', description: 'Your basic information' },
    { id: 2, title: 'Venue Info', description: 'Location and details' },
    { id: 3, title: 'Specs & Photos', description: 'PC specs and images' },
    { id: 4, title: 'Documents', description: 'Verify identity' },
];
