import { useEffect, useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { SeasonQualificationRecord, SeasonQualificationType } from '@/types/season';
import { Check, PencilLine, X } from 'lucide-react';

interface SeasonQualificationsPanelProps {
  qualifications: SeasonQualificationRecord[];
  className?: string;
  canManage?: boolean;
  canRespond?: boolean;
  destinationOptions?: Array<{ id: string; name: string }>;
  onRespond?: (recordId: string, status: 'accepted' | 'declined', notes?: string) => Promise<void> | void;
  onManage?: (payload: {
    recordId: string;
    status?: string;
    qualificationType?: SeasonQualificationType;
    destinationNodeId?: string;
    notes?: string;
  }) => Promise<void> | void;
  pendingRecordId?: string | null;
}

const MANAGER_STATUS_OPTIONS = ['earned', 'confirmed', 'invited', 'revoked', 'overridden'] as const;
const QUALIFICATION_TYPE_OPTIONS: SeasonQualificationType[] = ['qualified', 'wildcard', 'reserve'];

const statusTone = (status: string) => {
  if (status === 'accepted' || status === 'confirmed') return 'bg-emerald-500/10 text-emerald-300';
  if (status === 'declined' || status === 'revoked') return 'bg-red-500/10 text-red-300';
  if (status === 'invited' || status === 'earned' || status === 'pending') return 'bg-amber-500/10 text-amber-300';
  return 'bg-white/10 text-white';
};

const typeTone = (type: string | null) => {
  if (type === 'qualified') return 'bg-sky-500/10 text-sky-300';
  if (type === 'wildcard') return 'bg-violet-500/10 text-violet-300';
  if (type === 'reserve') return 'bg-zinc-500/10 text-zinc-300';
  return 'bg-white/10 text-white';
};

const SeasonQualificationsPanel = ({
  qualifications,
  className,
  canManage = false,
  canRespond = false,
  destinationOptions = [],
  onRespond,
  onManage,
  pendingRecordId,
}: SeasonQualificationsPanelProps) => {
  const [responseAction, setResponseAction] = useState<'accepted' | 'declined' | null>(null);
  const [responseRecord, setResponseRecord] = useState<SeasonQualificationRecord | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [manageRecord, setManageRecord] = useState<SeasonQualificationRecord | null>(null);
  const [manageState, setManageState] = useState<{
    status: string;
    qualificationType: SeasonQualificationType;
    destinationNodeId: string;
    notes: string;
  }>({
    status: 'earned',
    qualificationType: 'qualified',
    destinationNodeId: '',
    notes: '',
  });

  useEffect(() => {
    if (!manageRecord) return;
    setManageState({
      status: manageRecord.status,
      qualificationType: manageRecord.qualificationType ?? 'qualified',
      destinationNodeId: manageRecord.destinationNodeId ?? '',
      notes: manageRecord.notes ?? '',
    });
  }, [manageRecord]);

  const actionableStatuses = useMemo(() => new Set(['earned', 'invited']), []);

  if (qualifications.length === 0) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-zinc-400', className)}>
        No qualification records yet.
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {qualifications.map((qualification) => {
          const isActionable = canRespond && actionableStatuses.has(qualification.status);
          const isPending = pendingRecordId === qualification.id;

          return (
            <div
              key={qualification.id}
              className="rounded-3xl border border-white/10 bg-black/30 p-5 text-white backdrop-blur-xl"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{qualification.displayName ?? 'Qualification record'}</h3>
                      <Badge className={typeTone(qualification.qualificationType)}>{qualification.qualificationType ?? 'untyped'}</Badge>
                      <Badge className={statusTone(qualification.status)}>{qualification.status}</Badge>
                    </div>

                    <p className="text-sm text-zinc-400">
                      {qualification.sourceNodeName ?? 'Unknown source'}
                      {qualification.destinationNodeName ? ` → ${qualification.destinationNodeName}` : ''}
                    </p>
                  </div>

                  <div className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
                    <p>Placement: <span className="font-medium text-white">{qualification.placement ?? '—'}</span></p>
                    <p>Points snapshot: <span className="font-medium text-white">{qualification.pointsSnapshot ?? '—'}</span></p>
                    <p>Source tournament: <span className="font-medium text-white">{qualification.sourceTournamentName ?? '—'}</span></p>
                    <p>Updated: <span className="font-medium text-white">{new Date(qualification.updatedAt).toLocaleString()}</span></p>
                  </div>

                  {qualification.notes && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-zinc-500">Manager notes</p>
                      <p>{qualification.notes}</p>
                    </div>
                  )}

                  {qualification.participantResponseNote && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-100">
                      <p className="mb-1 text-xs uppercase tracking-[0.18em] text-emerald-300">Participant response</p>
                      <p>{qualification.participantResponseNote}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {canManage && onManage && (
                    <Button
                      variant="outline"
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => setManageRecord(qualification)}
                    >
                      <PencilLine className="mr-2 h-4 w-4" />
                      Manage
                    </Button>
                  )}

                  {isActionable && onRespond && (
                    <>
                      <Button
                        className="bg-emerald-500 text-white hover:bg-emerald-600"
                        disabled={isPending}
                        onClick={() => {
                          setResponseAction('accepted');
                          setResponseRecord(qualification);
                          setResponseNotes(qualification.participantResponseNote ?? '');
                        }}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                        disabled={isPending}
                        onClick={() => {
                          setResponseAction('declined');
                          setResponseRecord(qualification);
                          setResponseNotes(qualification.participantResponseNote ?? '');
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!responseAction && !!responseRecord} onOpenChange={(open) => !open && setResponseAction(null)}>
        <AlertDialogContent className="border-white/10 bg-[#0a0a0c] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {responseAction === 'accepted' ? 'Accept qualification' : 'Decline qualification'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This will update your qualification response for {responseRecord?.displayName ?? 'this record'}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="season-qualification-response-note">Optional note</Label>
            <Textarea
              id="season-qualification-response-note"
              value={responseNotes}
              onChange={(event) => setResponseNotes(event.target.value)}
              placeholder="Add context for your response"
              className="border-white/10 bg-white/5 text-white"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={responseAction === 'accepted' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}
              onClick={async () => {
                if (!responseAction || !responseRecord || !onRespond) return;
                await onRespond(responseRecord.id, responseAction, responseNotes || undefined);
                setResponseAction(null);
                setResponseRecord(null);
                setResponseNotes('');
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!manageRecord} onOpenChange={(open) => !open && setManageRecord(null)}>
        <DialogContent className="border-white/10 bg-[#0a0a0c] text-white sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage qualification</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Update workflow state, destination, and internal notes for this qualification record.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={manageState.status} onValueChange={(value) => setManageState((current) => ({ ...current, status: value }))}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {MANAGER_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Qualification type</Label>
              <Select
                value={manageState.qualificationType}
                onValueChange={(value: SeasonQualificationType) => setManageState((current) => ({ ...current, qualificationType: value }))}
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Destination node</Label>
              <Select
                value={manageState.destinationNodeId || '__none__'}
                onValueChange={(value) => setManageState((current) => ({ ...current, destinationNodeId: value === '__none__' ? '' : value }))}
              >
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select a destination" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No destination</SelectItem>
                  {destinationOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="season-qualification-manager-notes">Internal notes</Label>
              <Textarea
                id="season-qualification-manager-notes"
                value={manageState.notes}
                onChange={(event) => setManageState((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Record why you changed this qualification"
                className="border-white/10 bg-white/5 text-white"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setManageRecord(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-rose-500 text-white hover:bg-rose-600"
              onClick={async () => {
                if (!manageRecord || !onManage) return;
                await onManage({
                  recordId: manageRecord.id,
                  status: manageState.status || undefined,
                  qualificationType: manageState.qualificationType,
                  destinationNodeId: manageState.destinationNodeId || undefined,
                  notes: manageState.notes || undefined,
                });
                setManageRecord(null);
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SeasonQualificationsPanel;

