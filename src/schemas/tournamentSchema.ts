import { z } from 'zod';

// Helper to check if number is power of 2
const _isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

// Step 1: Basic Info Schema
const basicInfoBase = z.object({
    name: z.string()
        .min(3, 'Tournament name must be at least 3 characters')
        .max(100, 'Tournament name cannot exceed 100 characters'),
    game: z.string().min(1, 'Please select a game'),
    isOnline: z.boolean(),
    launchState: z.enum(['draft', 'private', 'public']),
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    venue: z.string().optional(),
    region: z.string().min(1, 'Please select a region'),
});

export const basicInfoSchema = basicInfoBase.refine(
    (data) => data.isOnline || (data.venue && data.venue.length > 0),
    { message: 'Venue is required for LAN tournaments', path: ['venue'] }
).refine((data) => {
    if (!data.startDate || !data.startTime || !data.endDate || !data.endTime) return true;
    const start = new Date(`${data.startDate}T${data.startTime}`);
    const end = new Date(`${data.endDate}T${data.endTime}`);
    return end > start;
}, { message: 'End time must be after start time', path: ['endTime'] });

// Step 2: Format & Rules Schema
const formatRulesBase = z.object({
    bracketType: z.enum(['single_elimination', 'double_elimination', 'swiss', 'round_robin']).optional().default('single_elimination'),
    maxTeams: z.number()
        .min(4, 'Minimum 4 teams')
        .max(1024, 'Maximum 1024 teams allowed'),
    teamSize: z.number().min(1).max(10),
    seedingType: z.enum(['random', 'manual', 'skill_based']).optional().default('random'),
    thirdPlaceMatch: z.boolean().optional().default(false),
});

export const formatRulesSchema = formatRulesBase.refine(
    (data) => {
        // For elimination brackets, recommend power of 2
        if (data.bracketType === 'single_elimination' || data.bracketType === 'double_elimination') {
            return true; // Warning only, not blocking
        }
        return true;
    },
    { message: 'Power of 2 recommended for elimination brackets', path: ['maxTeams'] }
);

// Step 3: Branding Schema — visual identity only
const brandingSchemaBase = z.object({
    bannerUrl: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    description: z.string()
        .min(20, 'Description must be at least 20 characters')
        .max(5000, 'Description cannot exceed 5000 characters'),
    discordUrl: z.string().url().optional().or(z.literal('')),
    twitterUrl: z.string().url().optional().or(z.literal('')),
    streamUrl: z.string().url().optional().or(z.literal('')),
    rewards: z.string().optional().nullable(),
});

export const brandingSchema = brandingSchemaBase;

// Step 4: Prizes Schema — prize pool, entry fee, payout
const prizesSchemaBase = z.object({
    prizePool: z.string().min(1, 'Prize pool is required'),
    entryFee: z.string().min(1, 'Entry fee is required (use "Free" if no fee)'),
});

export const prizesSchema = prizesSchemaBase;

// Step 5: Registration Schema (base for merging)
const registrationSchemaBase = z.object({
    registrationOpens: z.string().min(1, 'Registration open date is required'),
    registrationCloses: z.string().min(1, 'Registration close date is required'),
    checkInRequired: z.boolean(),
    checkInWindowMinutes: z.number(),
    autoRemoveUnchecked: z.boolean(),
    waitlistEnabled: z.boolean(),
    waitlistMax: z.number().min(0).max(100),
    invitedTeamsEnabled: z.boolean().optional().default(false),
    reservedInviteSlots: z.number().min(0).max(1024).optional().default(0),
    inviteExpiryDays: z.number().min(1).max(365).optional().default(7),
});

// Step 5: Registration Schema (with conditional validation)
export const registrationSchema = registrationSchemaBase
    .refine(
        (data) => {
            if (data.checkInRequired) {
                return data.checkInWindowMinutes >= 5 && data.checkInWindowMinutes <= 120;
            }
            return true;
        },
        { message: 'Check-in window must be between 5 and 120 minutes', path: ['checkInWindowMinutes'] },
    )
    .refine(
        (data) => !data.invitedTeamsEnabled || (data.reservedInviteSlots ?? 0) >= 1,
        { message: 'Reserve at least 1 slot for invited teams', path: ['reservedInviteSlots'] },
    )
    .refine(
        (data) => {
            if (!data.invitedTeamsEnabled) return true;
            const maxTeams = (data as { maxTeams?: number }).maxTeams ?? 0;
            if (maxTeams <= 0) return true;
            return (data.reservedInviteSlots ?? 0) <= maxTeams;
        },
        { message: 'Reserved invite slots cannot exceed max teams', path: ['reservedInviteSlots'] },
    );

// Full tournament schema
export const fullTournamentSchema = basicInfoBase
    .merge(formatRulesBase)
    .merge(brandingSchemaBase)
    .merge(prizesSchemaBase)
    .merge(registrationSchemaBase)
    .refine(
        (data) => data.isOnline || (data.venue && data.venue.length > 0),
        { message: 'Venue is required for LAN tournaments', path: ['venue'] }
    )
    .refine(
        (data) => {
            // Only validate checkInWindowMinutes range when check-in is enabled
            if (data.checkInRequired) {
                return data.checkInWindowMinutes >= 5 && data.checkInWindowMinutes <= 120;
            }
            return true;
        },
        { message: 'Check-in window must be between 5 and 120 minutes', path: ['checkInWindowMinutes'] }
    ).refine(
        (data) => !data.invitedTeamsEnabled || (data.reservedInviteSlots ?? 0) >= 1,
        { message: 'Reserve at least 1 slot for invited teams', path: ['reservedInviteSlots'] },
    )
    .refine(
        (data) => {
            if (!data.invitedTeamsEnabled) return true;
            if (data.maxTeams <= 0) return true;
            return (data.reservedInviteSlots ?? 0) <= data.maxTeams;
        },
        { message: 'Reserved invite slots cannot exceed max teams', path: ['reservedInviteSlots'] },
    );

// Helper function to validate a specific step
export const validateStep = (step: number, data: any): { valid: boolean; errors: Record<string, string> } => {
    const schemas: Record<number, z.ZodSchema> = {
        1: basicInfoSchema,
        2: formatRulesSchema,
        3: brandingSchema,
        4: prizesSchema,
        5: registrationSchema,
        // 6: Settings — no validation needed (all booleans with defaults)
        7: fullTournamentSchema, // Review validates everything
    };

    const schema = schemas[step];
    if (!schema) return { valid: true, errors: {} };

    // BR tournaments use tournamentType + stage format battle_royale; bracketType is legacy/unused.
    const payload =
        data?.tournamentType === 'battle_royale' && (step === 2 || step === 6)
            ? (({ bracketType: _ignored, ...rest }) => rest)(data)
            : data;

    try {
        schema.parse(payload);
        console.log('[Wizard Validation] Step', step, 'passed');
        return { valid: true, errors: {} };
    } catch (e) {
        if (e instanceof z.ZodError) {
            const errors: Record<string, string> = {};
            e.errors.forEach((err) => {
                const path = err.path.join('.');
                errors[path] = err.message;
                console.log('[Wizard Validation] Step', step, 'error:', path, '-', err.message);
            });
            return { valid: false, errors };
        }
        console.log('[Wizard Validation] Step', step, 'unknown error:', e);
        return { valid: false, errors: { _form: 'Validation failed' } };
    }
};

// Power of 2 suggestions
export const POWER_OF_TWO_OPTIONS = [4, 8, 16, 32, 64, 128, 256, 512, 1024];

// Bracket type labels
export const BRACKET_TYPE_LABELS: Record<string, string> = {
    single_elimination: 'Single Elimination',
    double_elimination: 'Double Elimination',
    swiss: 'Swiss',
    round_robin: 'Round Robin',
    // battle_royale removed
};

// Seeding type labels
export const SEEDING_TYPE_LABELS: Record<string, string> = {
    random: 'Random Seeding',
    manual: 'Manual Seeding',
    skill_based: 'Skill-based (Ranking)',
};
