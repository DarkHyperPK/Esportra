import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSubmitSquadUpReport, type ReportTarget } from '@/hooks/competitive/useSquadUpReport';
import { squadUpReportErrorMessage } from '@/lib/squadUpErrors';
import { MAX_REPORT_DETAILS, REPORT_REASONS, reportFormSchema, type ReportReason } from '@/schemas/squadUpReport';
import { SquadUpReportImages } from './SquadUpReportImages';
import './squad-up.css';

interface SquadUpReportDialogProps {
  target: ReportTarget | null;
  onClose: () => void;
}

export function SquadUpReportDialog({ target, onClose }: SquadUpReportDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="squad-report-dialog">
        {/* Keyed by player so a new report always starts blank. */}
        {target && <ReportForm key={target.userId} target={target} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ReportForm({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const submit = useSubmitSquadUpReport();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [proofLink, setProofLink] = useState('');
  const [hidePlayer, setHidePlayer] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [fieldError, setFieldError] = useState('');

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = reportFormSchema.safeParse({ reason, details, proofLink, hidePlayer });
    if (!parsed.success) { setFieldError(parsed.error.issues[0]?.message ?? 'Check the form and try again.'); return; }
    setFieldError('');
    submit.mutate({ target, form: parsed.data, files });
  }

  if (submit.isSuccess) {
    return (
      <div className="squad-report-done" role="status">
        <CheckCircle2 size={28} aria-hidden />
        <DialogTitle>Report sent</DialogTitle>
        <DialogDescription>
          Thank you. Our team will review it{hidePlayer ? ` and ${target.username} will not appear for you again` : ''}.
          We will let you know when it is reviewed.
        </DialogDescription>
        <button type="button" className="lfg-button lfg-button-primary" onClick={onClose}>Done</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="squad-report-form">
      <DialogTitle>Report {target.username}</DialogTitle>
      <DialogDescription>Reports are private. {target.username} is never told who reported them.</DialogDescription>
      <fieldset className="squad-report-reasons" disabled={submit.isPending}>
        <legend>What happened?</legend>
        {REPORT_REASONS.map((item) => (
          <label key={item.value}><input type="radio" name="reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} /> {item.label}</label>
        ))}
      </fieldset>
      <label className="lfg-field">Details
        <textarea className="lfg-input" rows={3} maxLength={MAX_REPORT_DETAILS} value={details} disabled={submit.isPending}
          placeholder="What did they say or do? When did it happen?" onChange={(event) => setDetails(event.target.value)} />
        <span className="squad-hint">{details.length}/{MAX_REPORT_DETAILS}</span>
      </label>
      <div className="lfg-field">Screenshots (proof)
        <SquadUpReportImages files={files} onChange={setFiles} disabled={submit.isPending} />
      </div>
      <label className="lfg-field">Link to a clip or other proof (optional)
        <input className="lfg-input" type="url" inputMode="url" placeholder="https://" value={proofLink} disabled={submit.isPending}
          onChange={(event) => setProofLink(event.target.value)} />
      </label>
      <label className="squad-report-hide">
        <input type="checkbox" checked={hidePlayer} disabled={submit.isPending} onChange={(event) => setHidePlayer(event.target.checked)} />
        Also hide this player from me
      </label>
      {(fieldError || submit.isError) && <p className="squad-error" role="alert">{fieldError || squadUpReportErrorMessage(submit.error)}</p>}
      <div className="squad-actions">
        <button type="button" className="lfg-button" disabled={submit.isPending} onClick={onClose}>Cancel</button>
        <button type="submit" className="lfg-button lfg-button-primary" disabled={submit.isPending}>
          {submit.isPending ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </form>
  );
}
