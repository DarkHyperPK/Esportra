import { createContext, useContext } from 'react';

export const PricingBookingContext = createContext<((opener: HTMLButtonElement, teamCount?: number) => void) | null>(null);
export function usePricingBooking() {
  const open = useContext(PricingBookingContext);
  if (!open) throw new Error('Pricing booking must be used inside its provider.');
  return open;
}
