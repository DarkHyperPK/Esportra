import { z } from 'zod';

const validDateOrder = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) return true;
  return new Date(endDate) >= new Date(startDate);
};

export const seasonBasicsSchema = z.object({
  name: z.string().min(3, 'Season name must be at least 3 characters').max(120, 'Season name cannot exceed 120 characters'),
  game: z.string().min(1, 'Please select a game'),
  participantMode: z.enum(['team', 'solo']),
  slug: z.string().max(120, 'Slug cannot exceed 120 characters').optional().or(z.literal('')),
  description: z.string().max(5000, 'Description cannot exceed 5000 characters').optional(),
});

export const seasonVisibilitySchema = z.object({
  status: z.enum(['draft', 'published', 'active', 'completed', 'archived']),
  isPublic: z.boolean(),
  allowManualOverrides: z.boolean(),
});

export const seasonScheduleSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  rootNodeName: z.string().max(120, 'Root node name cannot exceed 120 characters').optional(),
}).refine((data) => validDateOrder(data.startDate, data.endDate), {
  message: 'End date must be on or after the start date',
  path: ['endDate'],
});

export const fullSeasonSchema = seasonBasicsSchema
  .merge(seasonVisibilitySchema)
  .merge(seasonScheduleSchema)
  .refine((data) => validDateOrder(data.startDate, data.endDate), {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  });

export const validateSeasonStep = (step: number, data: unknown): { valid: boolean; errors: Record<string, string> } => {
  const schemaMap: Record<number, z.ZodSchema> = {
    1: seasonBasicsSchema,
    2: seasonVisibilitySchema,
    3: seasonScheduleSchema,
    4: fullSeasonSchema,
  };

  const schema = schemaMap[step];
  if (!schema) {
    return { valid: true, errors: {} };
  }

  try {
    schema.parse(data);
    return { valid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.reduce<Record<string, string>>((acc, issue) => {
          const field = issue.path.join('.');
          acc[field] = issue.message;
          return acc;
        }, {}),
      };
    }

    return { valid: false, errors: { _form: 'Validation failed.' } };
  }
};

