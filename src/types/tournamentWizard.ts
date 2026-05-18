// Tournament wizard types

import type { BRScoringPreset } from './battleRoyale';

export type BracketType = 'single_elimination' | 'double_elimination' | 'swiss' | 'round_robin';
export type TournamentType = 'bracket' | 'battle_royale';
export type SeedingType = 'random' | 'manual' | 'skill_based';
export type Visibility = 'public' | 'unlisted';

export interface TournamentStage {
    id?: string;
    name: string;
    format: BracketType;
    stage_order: number;
    config?: any;
}

export interface TournamentWizardData {
    // Step 1: Basic Info
    name: string;
    game: string;
    gameMode: string;
    isOnline: boolean;
    visibility: Visibility;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    venue: string;
    status: string;

    // Step 2: Format & Rules
    tournamentType: TournamentType;
    bracketType: BracketType; // Main format (legacy/fallback)
    stages: TournamentStage[];
    maxTeams: number;
    teamSize: number;
    seedingType: SeedingType;
    thirdPlaceMatch: boolean;
    mapPoolIds: string[]; // Selected map IDs for tournament map pool

    // Battle Royale specific (Step 2)
    brGameCount: number;
    brScoringPreset: string;
    brCustomScoring: BRScoringPreset | null;
    brKillCap: number | null;
    brTiebreaker: 'most_wins' | 'most_kills' | 'head_to_head';

    // Step 3: Branding
    bannerUrl: string | null;
    logoUrl: string | null;
    prizePool: string;
    entryFee: string;
    description: string;
    discordUrl: string;
    twitterUrl: string;
    streamUrl: string;
    rewards: string;

    // Step 4: Registration
    registrationOpens: string;
    registrationCloses: string;
    checkInRequired: boolean;
    checkInWindowMinutes: number;
    autoRemoveUnchecked: boolean;
    waitlistEnabled: boolean;
    waitlistMax: number;

    // Game-specific settings
    assistedMatchReporting: boolean;
    mapVetoEnabled: boolean;
}

export interface WizardStepProps {
    data: TournamentWizardData;
    updateData: (updates: Partial<TournamentWizardData>) => void;
    errors: Record<string, string>;
    isEditMode?: boolean;
    tournamentId?: string;
    participantsCount?: number;
}

export interface WizardStep {
    id: number;
    title: string;
    description: string;
    isValid: boolean;
    isComplete: boolean;
}

export const WIZARD_STEPS: Omit<WizardStep, 'isValid' | 'isComplete'>[] = [
    { id: 1, title: 'Basic Info', description: 'Name, game, and schedule' },
    { id: 2, title: 'Format & Rules', description: 'Bracket type and settings' },
    { id: 3, title: 'Branding', description: 'Images and prize pool' },
    { id: 4, title: 'Registration', description: 'Sign-up and check-in' },
    { id: 5, title: 'Settings', description: 'Match and game settings' },
    { id: 6, title: 'Review', description: 'Confirm and create' },
];

export const DEFAULT_WIZARD_DATA: TournamentWizardData = {
    // Step 1
    name: '',
    game: '',
    gameMode: '',
    isOnline: true,
    visibility: 'unlisted',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    venue: '',
    status: 'open',

    // Step 2
    tournamentType: 'bracket',
    bracketType: 'single_elimination',
    stages: [], // No default stage - configure via Stage Setup Wizard
    maxTeams: 0,
    teamSize: 7,
    seedingType: 'random',
    thirdPlaceMatch: false,
    mapPoolIds: [],

    // Battle Royale
    brGameCount: 6,
    brScoringPreset: '',
    brCustomScoring: null,
    brKillCap: null,
    brTiebreaker: 'most_wins',

    // Step 3
    bannerUrl: null,
    logoUrl: null,
    prizePool: '',
    entryFee: 'Free',
    description: '',
    discordUrl: '',
    twitterUrl: '',
    streamUrl: '',
    rewards: '',

    // Step 4
    registrationOpens: '',
    registrationCloses: '',
    checkInRequired: true,
    checkInWindowMinutes: 30,
    autoRemoveUnchecked: true,
    waitlistEnabled: false,
    waitlistMax: 10,

    // Game-specific
    assistedMatchReporting: false,
    mapVetoEnabled: true,
};
