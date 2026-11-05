import { useState } from 'react';
import { CheckCircle2, EyeOff, Link2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CommandButton } from '@/components/management/CommandSurface';
import { useSubmitSquadUpReport, type ReportTarget } from '@/hooks/competitive/useSquadUpReport';
import { squadUpReportErrorMessage } from '@/lib/squadUpErrors';
import { MAX_REPORT_DETAILS, REPORT_REASONS, reportFormSchema, type ReportReason } from '@/schemas/squadUpReport';
import { SquadUpReportImages } from './SquadUpReportImages';
import './squad-up.css';
import './report.css';

interface SquadUpReportDialogProps {
  target: ReportTarget | null;
  onClose: () => void;
}

export function SquadUpReportDialog({ target, onClose }: SquadUpReportDialogProps) {
  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="su-report-dialog">
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
      <div className="su-report-done" role="status">
        <CheckCircle2 size={32} aria-hidden />
        <DialogTitle className="su-report-title">Report sent</DialogTitle>
        <DialogDescription className="su-report-sub">
          Thank you. Our team will review it{hidePlayer ? ` and ${target.username} will not appear for you again` : ''}.
          We will let you know when it is reviewed.
        </DialogDescription>
        <CommandButton variant="primary" size="md" onClick={onClose}>Done</CommandButton>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="su-report-form">
      <header className="su-report-head">
        <span className="su-report-icon" aria-hidden><ShieldAlert size={18} /></span>
        <div>
          <DialogTitle className="su-report-title">Report {target.username}</DialogTitle>
          <DialogDescription className="su-report-sub">Private. {target.username} is never told who reported them.</DialogDescription>
        </div>
      </header>

      <fieldset className="su-report-reasons" disabled={submit.isPending}>
        <legend className="su-report-label">What happened?</legend>
        <div className="su-report-reason-grid">
          {REPORT_REASONS.map((item) => (
            <label key={item.value} className="su-report-reason">
              <input type="radio" name="reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="su-report-field">
        <span className="su-report-label">Details <small>{details.length}/{MAX_REPORT_DETAILS}</small></span>
        <textarea rows={3} maxLength={MAX_REPORT_DETAILS} value={details} disabled={submit.isPending}
          placeholder="What did they say or do? When did it happen?" onChange={(event) => setDetails(event.target.value)} />
      </label>

      <div className="su-report-field">
        <span className="su-report-label">Screenshots <small>proof helps us act faster</small></span>
        <SquadUpReportImages files={files} onChange={setFiles} disabled={submit.isPending} />
      </div>

      <label className="su-report-field">
        <span className="su-report-label">Link to a clip <small>optional</small></span>
        <span className="su-report-input-icon">
          <Link2 size={15} aria-hidden />
          <input type="url" inputMode="url" placeholder="https://" value={proofLink} disabled={submit.isPending}
            onChange={(event) => setProofLink(event.target.value)} />
        </span>
      </label>

      <label className="su-report-toggle">
        <input type="checkbox" checked={hidePlayer} disabled={submit.isPending} onChange={(event) => setHidePlayer(event.target.checked)} />
        <EyeOff size={15} aria-hidden />
        <span>Also hide this player from me</span>
      </label>

      {(fieldError || submit.isError) && <p className="su-report-error" role="alert">{fieldError || squadUpReportErrorMessage(submit.error)}</p>}
      <div className="su-report-actions">
        <CommandButton type="button" variant="ghost" size="md" disabled={submit.isPending} onClick={onClose}>Cancel</CommandButton>
        <CommandButton type="submit" variant="primary" size="md" disabled={submit.isPending}>{submit.isPending ? 'Sending…' : 'Send report'}</CommandButton>
      </div>
    </form>
  );
}
