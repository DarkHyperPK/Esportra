import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { usePricingBooking } from './pricingBookingContext';

export default function PricingBookingButton({ children, className, teamCount }: { children: ReactNode; className?: string; teamCount?: number }) {
  const open = usePricingBooking();
  return <button type="button" className={className} onClick={event => open(event.currentTarget, teamCount)}>{children}<ArrowUpRight size={17} aria-hidden="true" /></button>;
}
