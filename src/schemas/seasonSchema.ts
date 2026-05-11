import { z } from 'zod';

export const seasonBasicsSchema = z.object({
  name: z
    .string()
    .min(2, 'Season name must be at least 2 characters')
    .max(100, 'Season name cannot exceed 100 characters'),
  game: z.string().min(1, 'Please select a game'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(80, 'Slug cannot exceed 80 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPublic: z.boolean().optional(),
  participantMode: z.enum(['team', 'solo']).optional(),
});

export type SeasonBasicsFormData = z.infer<typeof seasonBasicsSchema>;
