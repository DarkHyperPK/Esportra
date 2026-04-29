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
  rootNodeName: string;
}

export interface SeasonWizardStep {
  id: number;
  title: string;
  description: string;
}

export const SEASON_WIZARD_STEPS: SeasonWizardStep[] = [
  { id: 1, title: 'Basics', description: 'Name, game, mode, and slug' },
  { id: 2, title: 'Visibility', description: 'Status, privacy, and overrides' },
  { id: 3, title: 'Schedule', description: 'Dates and root label' },
  { id: 4, title: 'Review', description: 'Confirm and create the season' },
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
  rootNodeName: '',
};

