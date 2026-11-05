import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ReportAction, ResolveReportInput } from '@/schemas/squadUpAdmin';

const ACTIONS: { value: ReportAction; label: string; help: string }[] = [
  { value: 'dismiss', label: 'Dismiss', help: 'No violation. The reporter is told it was reviewed.' },
  { value: 'warn', label: 'Warn the player', help: 'Sends a warning. Counts toward their record.' },
  { value: 'squad_up_ban', label: 'Remove from Squad Up', help: 'Ends their session and blocks them for the time you choose.' },
  { value: 'suspend', label: 'Suspend the account', help: 'Signs them out of the whole platform. Needs the users:ban permission.' },
];
const DURATIONS = [{ hours: 24, label: '24 hours' }, { hours: 168, label: '7 days' }, { hours: 720, label: '30 days' }, { hours: 0, label: 'Permanently' }];

interface SquadUpResolveFormProps {
  canManage: boolean;
  canSuspend: boolean;
  pending: boolean;
  error?: string;
  onResolve: (input: ResolveReportInput) => void;
}

export function SquadUpResolveForm({ canManage, canSuspend, pending, error, onResolve }: SquadUpResolveFormProps) {
  const [action, setAction] = useState<ReportAction>('dismiss');
  const [hours, setHours] = useState(24);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const noteNeeded = action !== 'dismiss';
  const valid = !noteNeeded || note.trim().length >= 5;

  if (!canManage) return <p className="text-sm text-zinc-400">You can view this report. Taking action needs the squad_up:manage permission.</p>;

  return (
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (valid) setConfirming(true); }}>
      <fieldset className="space-y-2" disabled={pending}>
        <legend className="text-sm font-semibold text-white">Decision</legend>
        {ACTIONS.map((item) => {
          const blocked = item.value === 'suspend' && !canSuspend;
          return (
            <label key={item.value} className={`flex items-start gap-2 text-sm ${blocked ? 'opacity-50' : ''}`}>
              <input type="radio" name="action" className="mt-1" checked={action === item.value} disabled={blocked} onChange={() => setAction(item.value)} />
              <span><span className="text-white">{item.label}</span><br /><span className="text-xs text-zinc-400">{blocked ? 'You do not have users:ban.' : item.help}</span></span>
            </label>
          );
        })}
      </fieldset>
      {action === 'squad_up_ban' && (
        <label className="block text-sm text-zinc-200">Duration
          <select className="lfg-input mt-1" value={hours} onChange={(event) => setHours(Number(event.target.value))}>
            {DURATIONS.map((item) => <option key={item.hours} value={item.hours}>{item.label}</option>)}
          </select>
        </label>
      )}
      <label className="block text-sm text-zinc-200">Note for the record {noteNeeded ? '(required)' : '(optional)'}
        <textarea className="lfg-input mt-1" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}
      <button type="submit" className="lfg-button lfg-button-primary" disabled={pending || !valid}>{pending ? 'Saving…' : 'Apply decision'}</button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply this decision?</AlertDialogTitle>
            <AlertDialogDescription>
              {ACTIONS.find((item) => item.value === action)?.label}
              {action === 'squad_up_ban' && ` for ${DURATIONS.find((item) => item.hours === hours)?.label.toLowerCase()}`}. It is recorded in the audit log and the reporter is notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onResolve({ action, note: note.trim(), durationHours: action === 'squad_up_ban' ? hours : undefined })}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
