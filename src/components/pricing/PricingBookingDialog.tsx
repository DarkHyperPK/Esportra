import { useEffect, useRef, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useProEventRequest } from '@/hooks/useProEventRequest';
import type { ProEventDetails } from '@/schemas/proEventRequest';
import { EVENT_RATES, formatPkr } from './pricingContent';
import PricingBookingForm from './PricingBookingForm';
import PricingInvoice from './PricingInvoice';

interface Props { open: boolean; onOpenChange: (open: boolean) => void; teams: string; email: string; opener: React.RefObject<HTMLButtonElement>; }

export default function PricingBookingDialog({ open, onOpenChange, teams, email, opener }: Props) {
  const [draft, setDraft] = useState<ProEventDetails>({ eventName: '', gameTitle: '', email, startsOn: '', endsOn: '', teamCount: 64, website: '' });
  const [copyState, setCopyState] = useState('Copy reference');
  const { receipt, pending, error, submit, requestAccess, restoredDetails, invoiceStatus, markProofSubmitted, reset } = useProEventRequest();
  const receiptTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (open && !receipt) setDraft(previous => ({ ...previous, teamCount: teams === 'custom' ? 513 : Number(teams), email: previous.email || email })); }, [open, teams, email, receipt]);
  useEffect(() => { if (restoredDetails) setDraft(restoredDetails); }, [restoredDetails]);
  useEffect(() => { if (receipt && open) receiptTitle.current?.focus(); }, [receipt, open]);
  const estimate = EVENT_RATES.find(item => draft.teamCount > 32 && draft.teamCount <= item.teams);
  const quotedAmount = receipt ? receipt.estimatedAmount : estimate?.price;
  const copyReference = async () => {
    if (!receipt) return;
    try { await navigator.clipboard.writeText(receipt.reference); setCopyState('Reference copied'); }
    catch { setCopyState('Select and copy the reference above'); }
  };
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>{open && <Dialog.Portal>
    <Dialog.Overlay className="pricing-booking-backdrop" />
    <Dialog.Content className="pricing-booking-dialog" onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
      <Dialog.Close className="pricing-booking-close" aria-label="Close event booking"><X size={20} aria-hidden="true" /></Dialog.Close>
      <div className="pricing-booking-intro"><p className="pricing-caption">YOUR NEXT MATCH DAY</p><Dialog.Title>Your next event.<br />One clear plan.</Dialog.Title><Dialog.Description>Your event details, payment instructions and proof. All here.</Dialog.Description><ol><li><span>01</span> Create your event invoice.</li><li><span>02</span> Pay the business account.</li><li><span>03</span> Submit proof for verification.</li></ol><div className="pricing-booking-quote"><p className="pricing-caption">{receipt?.invoice ? 'Your invoice amount' : 'Your event pass estimate'}</p><strong>{quotedAmount != null ? `PKR ${formatPkr(quotedAmount)}` : 'Custom quote'}</strong><p>Per event. No subscription.<br />Custom-sized events need an individual quote.</p></div></div>
      <div className="pricing-booking-body">{receipt ? <div className="pricing-booking-receipt"><Check size={32} aria-hidden="true" /><h3 ref={receiptTitle} tabIndex={-1}>{receipt.invoice ? 'Your Pro invoice is ready.' : 'Your event brief is saved.'}</h3>{receipt.invoice && requestAccess ? <PricingInvoice receipt={receipt} draft={draft} access={requestAccess} proofSubmitted={invoiceStatus === 'proof_submitted'} onProofSubmitted={markProofSubmitted} status={invoiceStatus} /> : <><p>Our team can now review your plans and follow up at <strong>{draft.email}</strong>.</p><p className="pricing-caption">YOUR REQUEST REFERENCE</p><code>{receipt.reference}</code><button type="button" onClick={copyReference}><Copy size={15} aria-hidden="true" />{copyState}</button><p role="status">No payment has been taken. Your event is not booked or activated yet.</p></>}<Dialog.Close className="pricing-button pricing-button-primary">Back to the page</Dialog.Close><button type="button" className="pricing-booking-new" onClick={() => { reset(); setDraft(previous => ({ ...previous, eventName: '', startsOn: '', endsOn: '' })); }}>Plan another event</button></div> : <PricingBookingForm draft={draft} onChange={setDraft} onSubmit={event => { event.preventDefault(); void submit(draft); }} pending={pending} error={error} />}</div>
    </Dialog.Content>
  </Dialog.Portal>}</Dialog.Root>;
}
