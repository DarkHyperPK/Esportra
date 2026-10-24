import { z } from 'zod';

export const proEventDetailsSchema = z.object({
  eventName: z.string().trim().min(3, 'Give your event a name.').max(120),
  gameTitle: z.string().trim().min(2, 'Enter a game title.').max(80),
  email: z.string().trim().email('Enter a valid reply email.').max(254),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a start date.'),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose an end date.'),
  teamCount: z.coerce.number().int().min(2).max(10000),
  website: z.string().max(0),
}).refine(value => value.endsOn >= value.startsOn, { message: 'End date must be on or after the start.', path: ['endsOn'] });

const paymentDetailsSchema = z.object({ sellerName: z.string(), bankName: z.string(), accountTitle: z.string(), accountNumber: z.string(), instructions: z.string(), qrImageUrl: z.string().url().nullable() });
export const proEventReceiptSchema = z.object({ reference: z.string().regex(/^ESP-[A-F0-9]{32}$/), estimatedAmount: z.number().int().positive().nullable(), currency: z.literal('PKR'), invoice: z.object({ amount: z.number().int().positive(), currency: z.literal('PKR'), expiresAt: z.string(), paymentDetails: paymentDetailsSchema }).nullish() });
export type ProEventDetails = z.infer<typeof proEventDetailsSchema>;
export type ProEventReceipt = z.infer<typeof proEventReceiptSchema>;
