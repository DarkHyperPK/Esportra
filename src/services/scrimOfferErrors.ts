/**
 * Plain-language errors for offer actions (accept / decline / withdraw).
 */

import { ApiError, getApiErrorMessage } from '@/lib/apiClient';

export type OfferAction = 'accept' | 'decline' | 'withdraw';

const PERMISSION: Record<OfferAction, string> = {
  accept: 'Only a team captain or manager can accept offers.',
  decline: 'Only a team captain or manager can decline offers.',
  withdraw: 'Only a team captain or manager can withdraw this offer.',
};

export function offerActionError(error: unknown, action: OfferAction): string {
  const fallback = `Could not ${action} offer. Try again.`;
  if (error instanceof ApiError) {
    if (error.status === 403) return PERMISSION[action];
    if (action === 'accept' && error.status === 409) {
      return getApiErrorMessage(error, 'This slot has just been booked. Please select another time.');
    }
    if (action === 'accept' && error.status === 400) {
      return getApiErrorMessage(error, "The selected time is outside the listing's availability window.");
    }
  }
  return getApiErrorMessage(error, fallback);
}
