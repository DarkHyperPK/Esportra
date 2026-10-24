import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import type { ProEventDetails, ProEventReceipt } from '@/schemas/proEventRequest';
import { useProEventProof } from '@/hooks/useProEventProof';
import { formatPkr } from './pricingContent';

interface Props { receipt: ProEventReceipt; draft: ProEventDetails; access: { id: string; accessToken: string }; proofSubmitted: boolean; onProofSubmitted: () => void; status: string; }

export default function PricingInvoice({ receipt, draft, access, proofSubmitted, onProofSubmitted, status }: Props) {
  const [copied, setCopied] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const proof = useProEventProof(proofSubmitted);
  const invoice = receipt.invoice;
  if (!invoice) return null;
  const payee = invoice.paymentDetails;
  const expired = new Date(invoice.expiresAt).getTime() <= Date.now() || status === 'closed';
  const download = () => {
    const content = ['PRO FORMA INVOICE', receipt.reference, `Seller: ${payee.sellerName}`, `Event: ${draft.eventName}`, `Game: ${draft.gameTitle}`, `Dates: ${draft.startsOn} to ${draft.endsOn} (PKT)`, `Maximum teams: ${draft.teamCount}`, `Amount due: PKR ${formatPkr(invoice.amount)}`, `Expires: ${new Date(invoice.expiresAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT`, `Bank: ${payee.bankName}`, `Account title: ${payee.accountTitle}`, `Account: ${payee.accountNumber}`, payee.instructions, 'Use the invoice reference with your payment. Payment must be verified before activation. This is not a payment receipt or tax invoice.'].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${receipt.reference}.txt`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="pricing-invoice">
    <p className="pricing-caption">PRO FORMA INVOICE · {proof.submitted ? 'PROOF UNDER REVIEW' : status === 'closed' ? 'CLOSED' : expired ? 'EXPIRED' : 'AWAITING PAYMENT'}</p>
    <strong className="pricing-invoice-amount">PKR {formatPkr(invoice.amount)}</strong><p>{draft.eventName} · {draft.teamCount} teams</p>
    <div className="pricing-invoice-reference"><code>{receipt.reference}</code><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(receipt.reference); setCopied(true); } catch { setCopied(false); } }} aria-label="Copy invoice reference"><Copy size={15} /></button></div>{copied && <span role="status">Reference copied</span>}
    <dl className="pricing-invoice-payee"><div><dt>Seller</dt><dd>{payee.sellerName}</dd></div><div><dt>Bank / provider</dt><dd>{payee.bankName}</dd></div><div><dt>Account title</dt><dd>{payee.accountTitle}</dd></div><div><dt>Account / IBAN</dt><dd>{payee.accountNumber}</dd></div></dl>
    {payee.qrImageUrl && <img className="pricing-invoice-qr" src={payee.qrImageUrl} alt="Configured business payment QR" />}
    <p>{payee.instructions || 'Transfer to the business account above and include your invoice reference.'}</p><p>Pay before {new Date(invoice.expiresAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })} PKT.</p>
    <button type="button" className="pricing-invoice-download" onClick={download}><Download size={15} />Download invoice details</button>
    {proof.submitted ? <div className="pricing-invoice-proof-saved" role="status"><Check size={20} /><strong>Proof submitted for review.</strong><p>We’ll check the funds received. Your event is not activated by this upload.</p></div> : <form className="pricing-invoice-upload" onSubmit={event => { event.preventDefault(); if (file) void proof.upload(file, access.id, access.accessToken).then(saved => { if (saved) onProofSubmitted(); }); }}><label htmlFor="pro-payment-proof">Already paid? Upload proof<input id="pro-payment-proof" type="file" accept="image/jpeg,image/png,image/webp" required disabled={proof.pending || expired} onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><p>JPEG, PNG or WebP · up to 5 MB. Proof is private to authorized staff.</p>{proof.error && <p className="pricing-booking-error" role="alert">{proof.error}</p>}<button className="pricing-button pricing-button-primary" type="submit" disabled={!file || proof.pending || expired}>{proof.pending ? 'Uploading proof…' : expired ? 'Invoice expired' : 'Submit payment proof'}</button></form>}
  </div>;
}
