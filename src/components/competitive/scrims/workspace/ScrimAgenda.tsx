/**
 * ScrimAgenda
 *
 * Active scrims in the order they will happen: live first, then today, this
 * week, later. Prop-driven; the page owns loading and the query.
 */

import { SCRIM_LABEL } from '../scrimCardStyles';
import { Link } from 'react-router-dom';
import { AccentButton } from '@/components/ui/button';

import { groupAgenda } from '@/services/scrimAgenda';
import { AgendaRow } from './AgendaRow';
import type { ScrimSession } from '@/types/competitive';

interface ScrimAgendaProps {
  sessions: ScrimSession[];
  teamId: string;
  /** Shared clock so every row re-evaluates its stage together. */
  nowMs: number;
  /** Session ids already shown under "Needs you". */
  queuedSessionIds: ReadonlySet<string>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNewScrim: () => void;
}

export function ScrimAgenda({ sessions, teamId, nowMs, queuedSessionIds, isLoading, isError, onRetry, onNewScrim }: ScrimAgendaProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2" aria-busy="true" aria-label="Loading agenda">
        {[1, 2, 3].map((i) => <div key={i} className="h-[88px] border border-white/[0.06] bg-white/[0.03]" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 border border-white/[0.08] p-4">
        <p className="text-[13px] text-white/55">Could not load your scrims. Check your connection and try again.</p>
        <button
          type="button"
          onClick={onRetry}
          className="border border-white/[0.14] px-4 py-2 text-[13px] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          Retry
        </button>
      </div>
    );
  }

  const groups = groupAgenda(sessions, nowMs);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 border border-dashed border-white/[0.12] p-5">
        <p className="text-[14px] font-medium text-white/80">No scrims coming up</p>
        <p className="max-w-md text-[13px] text-zinc-400">
          Post a listing so teams can find you, or browse open listings and send a request.
        </p>
        <div className="flex flex-wrap gap-3">
          <AccentButton onClick={onNewScrim} className="h-10 px-5 text-[13px] font-semibold rounded-lg font-sans text-[13px] font-semibold normal-case tracking-normal">Post a listing</AccentButton>
          <Link
            to="/competitive/scrims"
            className="inline-flex min-h-[40px] items-center rounded-lg border border-white/[0.14] px-4 text-[13px] text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Find a scrim
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <h3 className={SCRIM_LABEL}>{group.label}</h3>
          <ul className="space-y-2">
            {group.sessions.map((s) => <AgendaRow key={s.id} session={s} teamId={teamId} nowMs={nowMs} queued={queuedSessionIds.has(s.id)} />)}
          </ul>
        </div>
      ))}
    </div>
  );
}
