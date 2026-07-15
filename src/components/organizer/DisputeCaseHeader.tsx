import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertCircle, CheckCircle, XCircle, Clock, User, MoreHorizontal, ChevronDown, Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DisputeStaffPicker from './DisputeStaffPicker';
import type { DisputeStaffMember } from './DisputeActions';

interface DisputeCaseHeaderProps {
  referenceNumber?: string | null;
  title: string;
  status: 'open' | 'resolved' | 'rejected';
  raisedByName?: string;
  teamName?: string;
  createdAt: string;
  timeAgo: string;
  disputeId: string;
  matchId?: string | null;
  riotMatchIds?: string[];
  assigneeId: string | null;
  staffMembers: DisputeStaffMember[];
  canAssignOthers: boolean;
  canAssist: boolean;
  isClosed: boolean;
  onAssigneeChange: (id: string) => void;
}

const statusCfg = {
  open: { icon: AlertCircle, label: 'Open', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  resolved: { icon: CheckCircle, label: 'Closed', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { icon: XCircle, label: 'Closed', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
} as const;

const DisputeCaseHeader: React.FC<DisputeCaseHeaderProps> = ({
  referenceNumber,
  title,
  status,
  raisedByName,
  teamName,
  createdAt,
  timeAgo,
  disputeId,
  matchId,
  riotMatchIds,
  assigneeId,
  staffMembers,
  canAssignOthers,
  canAssist,
  isClosed,
  onAssigneeChange,
}) => {
  const { toast } = useToast();
  const cfg = statusCfg[status];
  const StatusIcon = cfg.icon;

  const assigneeLabel = staffMembers.find((m) => m.value === assigneeId)?.label || 'Unassigned';

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied` });
  };

  return (
    <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] bg-[#0a0a0c]/95 backdrop-blur-md">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {referenceNumber && (
              <span className="font-mono text-sm text-rose-400/70 shrink-0">{referenceNumber}</span>
            )}
            <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Filed by {raisedByName}
              {teamName && <span className="text-zinc-600">({teamName})</span>}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="flex items-center gap-1" title={new Date(createdAt).toLocaleString()}>
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>
        </div>

        <Badge className={`${cfg.cls} text-xs shrink-0`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {cfg.label}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mt-2">
        {canAssist && !isClosed && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-white/[0.06] rounded-lg px-2.5 py-1.5 hover:bg-white/[0.04] transition min-h-[44px]"
              >
                Reviewer: <span className="text-white font-medium">{assigneeLabel}</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-72 bg-[#121214] border-white/[0.06] p-2"
            >
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold px-2 py-1">
                Assign reviewer
              </p>
              <DisputeStaffPicker
                assigneeId={assigneeId}
                staffMembers={staffMembers}
                canAssignOthers={canAssignOthers}
                isClosed={isClosed}
                compact
                onAssigneeChange={onAssigneeChange}
              />
            </PopoverContent>
          </Popover>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-white/[0.04] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#121214] border-white/[0.06]">
            <DropdownMenuItem onClick={() => copy(disputeId, 'Dispute ID')}>
              <Copy className="w-3.5 h-3.5 mr-2" />
              Copy dispute ID
            </DropdownMenuItem>
            {matchId && (
              <DropdownMenuItem onClick={() => copy(matchId, 'Match ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" />
                Copy match ID
              </DropdownMenuItem>
            )}
            {referenceNumber && (
              <DropdownMenuItem onClick={() => copy(referenceNumber, 'Reference')}>
                <Copy className="w-3.5 h-3.5 mr-2" />
                Copy reference
              </DropdownMenuItem>
            )}
            {riotMatchIds?.map((rid) => (
              <DropdownMenuItem key={rid} onClick={() => copy(rid, 'Riot Match ID')}>
                <Copy className="w-3.5 h-3.5 mr-2" />
                Copy Riot ID
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default DisputeCaseHeader;
