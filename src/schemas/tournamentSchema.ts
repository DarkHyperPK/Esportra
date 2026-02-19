import { z } from 'zod';

// Helper to check if number is power of 2
const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

// Step 1: Basic Info Schema
const basicInfoBase = z.object({
    name: z.string()
        .min(3, 'Tournament name must be at least 3 characters')
        .max(100, 'Tournament name cannot exceed 100 characters'),
    game: z.string().min(1, 'Please select a game'),
    isOnline: z.boolean(),
    visibility: z.enum(['public', 'unlisted']),
    startDate: z.string().min(1, 'Start date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endDate: z.string().optional(),
    endTime: z.string().optional(),
    venue: z.string().optional(),
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
        .min(0, 'Invalid value')
        .max(256, 'Maximum 256 teams allowed'),
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

// Step 3: Branding Schema
const brandingSchemaBase = z.object({
    bannerUrl: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    prizePool: z.string().min(1, 'Prize pool is required'),
    entryFee: z.string().min(1, 'Entry fee is required (use "Free" if no fee)'),
    description: z.string()
        .min(20, 'Description must be at least 20 characters')
        .max(5000, 'Description cannot exceed 5000 characters'),
    discordUrl: z.string().url().optional().or(z.literal('')),
    twitterUrl: z.string().url().optional().or(z.literal('')),
    streamUrl: z.string().url().optional().or(z.literal('')),
    rewards: z.string().optional().nullable(),
});

export const brandingSchema = brandingSchemaBase.refine((data) => {
    if (!data.rewards) return true;

    // Parse percentages
    const firstMatch = data.rewards.match(/1st:\s*(\d+)%/i);
    const secondMatch = data.rewards.match(/2nd:\s*(\d+)%/i);

    const first = firstMatch ? parseInt(firstMatch[1], 10) : 0;
    const second = secondMatch ? parseInt(secondMatch[1], 10) : 0;

    const total = first + second;
    return total <= 100;
}, {
    message: "Total prize distribution cannot exceed 100%",
    path: ["rewards"]
});

// Step 4: Registration Schema (base for merging)
const registrationSchemaBase = z.object({
    registrationOpens: z.string().min(1, 'Registration open date is required'),
    registrationCloses: z.string().min(1, 'Registration close date is required'),
    checkInRequired: z.boolean(),
    checkInWindowMinutes: z.number(),
    autoRemoveUnchecked: z.boolean(),
    waitlistEnabled: z.boolean(),
    waitlistMax: z.number().min(0).max(100),
});

// Step 4: Registration Schema (with conditional validation for step 4)
export const registrationSchema = registrationSchemaBase.refine(
    (data) => {
        // Only validate checkInWindowMinutes range when check-in is enabled
        if (data.checkInRequired) {
            return data.checkInWindowMinutes >= 5 && data.checkInWindowMinutes <= 120;
        }
        return true; // Skip validation when check-in is disabled
    },
    { message: 'Check-in window must be between 5 and 120 minutes', path: ['checkInWindowMinutes'] }
);

// Full tournament schema
export const fullTournamentSchema = basicInfoBase
    .merge(formatRulesBase)
    .merge(brandingSchemaBase)
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
    ).refine((data) => {
        if (!data.rewards) return true;
        // Parse percentages
        const firstMatch = data.rewards.match(/1st:\s*(\d+)%/i);
        const secondMatch = data.rewards.match(/2nd:\s*(\d+)%/i);

        const first = firstMatch ? parseInt(firstMatch[1], 10) : 0;
        const second = secondMatch ? parseInt(secondMatch[1], 10) : 0;

        const total = first + second;
        return total <= 100;
    }, {
        message: "Total prize distribution cannot exceed 100%",
        path: ["rewards"]
    });

// Helper function to validate a specific step
export const validateStep = (step: number, data: any): { valid: boolean; errors: Record<string, string> } => {
    const schemas: Record<number, z.ZodSchema> = {
        1: basicInfoSchema,
        2: formatRulesSchema,
        3: brandingSchema,
        4: registrationSchema,
        5: fullTournamentSchema, // Review validates everything
    };

    const schema = schemas[step];
    if (!schema) return { valid: true, errors: {} };

    try {
        schema.parse(data);
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
