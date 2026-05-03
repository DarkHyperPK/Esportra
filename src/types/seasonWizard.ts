import type { SeasonParticipantMode, SeasonStatus } from '@/types/season';

export interface SeasonWizardData {
  name: string;
  game: string;
  participantMode: SeasonParticipantMode;
  status: SeasonStatus;
  slug: string;
  description: string;
  isPublic: boolean;
  allowManualOverrides: boolean;
  startDate: string;
  endDate: string;
}

export interface SeasonWizardStep {
  id: number;
  title: string;
  description: string;
}

export const SEASON_WIZARD_STEPS: SeasonWizardStep[] = [
  { id: 1, title: 'Basics', description: 'Core season settings' },
  { id: 2, title: 'Structure', description: 'Build the qualification flow' },
  { id: 3, title: 'Review', description: 'Confirm and create' },
];

export const DEFAULT_SEASON_WIZARD_DATA: SeasonWizardData = {
  name: '',
  game: '',
  participantMode: 'team',
  status: 'draft',
  slug: '',
  description: '',
  isPublic: false,
  allowManualOverrides: true,
  startDate: '',
  endDate: '',
};

