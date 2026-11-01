import { Link } from 'react-router-dom';
import { Info, TriangleAlert } from 'lucide-react';
import { StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { useGameCatalogContext } from '@/hooks/useGameCatalogContext';
import {
  useConfirmScrimResult,
  useCompleteScrimSession,
  useCancelScrimSession,
} from '@/hooks/competitive/useScrims';
import { SCRIM_CARD_CLASS, SCRIM_EYEBROW } from './WorkspaceListingCard';
import { bestOfLabel } from '@/services/scrimUtils';
import type { ScrimSession } from '@/types/competitive';

const ROSE_CTA =
  'inline-flex items-center gap-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[12px] font-semibold px-3.5 py-1.5 transition-colors shadow-[0_0_12px_0_rgba(255,45,85,0.35)]';
const GHOST_CTA =
  'inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] text-white/65 hover:text-white hover:border-white/[0.2] text-[12px] font-medium px-3.5 py-1.5 transition-colors';

// ─── Phase logic ──────────────────────────────────────────────────────────────

const SESSION_TONE = {
  scheduled: 'neutral',
  in_progress: 'accent',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'warning',
} as const;

function isWithinCheckInWindow(scheduledAt: string | null): boolean {
  if (!scheduledAt) return false;
  const now = Date.now();
  const then = new Date(scheduledAt).getTime();
  const diff = then - now;
  return diff >= -5 * 60_000 && diff <= 30 * 60_000;
}

function formatSessionDate(iso: string | null): string {
  if (!iso) return 'Start time not set';
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} · ${time}`;
}

// ─── Card ─────────────────────────────────────────────────────────────────────

/**
 * Compact session card — the management view of one scheduled/played scrim.
 * Everything interactive stays in the room (lobby codes, dispute, reporting);
 * the card surfaces one obvious next action per phase.
 */
export function WorkspaceSessionCard({
  session,
  teamId,
  overlappingWith = [],
}: {
  session: ScrimSession;
  teamId: string;
  /** Opponent names of other scrims whose times intersect this one. */
  overlappingWith?: string[];
}) {
  const completeMutation = useCompleteScrimSession(session.id);
  const cancelMutation = useCancelScrimSession(session.id);
  const confirmMutation = useConfirmScrimResult(session.id);
  const catalog = useGameCatalogContext();
  const anyPending = completeMutation.isPending || cancelMutation.isPending;

  const iAmTeam1 = session.team1Id === teamId;
  const opponentName = (iAmTeam1 ? session.team2Name : session.team1Name) ?? 'Opponent';
  const opponentLogo = (iAmTeam1 ? session.team2Logo : session.team1Logo) ?? null;
  const catalogGame = catalog.games.find((g) => g.slug === session.gameSlug);
  const opponentReported = iAmTeam1
    ? session.resultReportedByTeam2
    : session.resultReportedByTeam1;
  const iReported = iAmTeam1
    ? session.resultReportedByTeam1
    : session.resultReportedByTeam2;
  const checkInOpen = session.status === 'scheduled' && isWithinCheckInWindow(session.scheduledAt);
  const confirmPending =
    opponentReported &&
    (session.status === 'scheduled' || session.status === 'in_progress');

  return (
    <div
      className={`${SCRIM_CARD_CLASS} ${
        session.status === 'in_progress'
          ? 'border-rose-500/30 hover:border-rose-500/40'
          : checkInOpen
          ? 'border-amber-500/30 hover:border-amber-500/40'
          : ''
      }`}
    >
      {session.status === 'in_progress' && (
        <div className="rounded-t-2xl h-[2px] mb-px bg-gradient-to-r from-rose-500 via-rose-500/50 to-transparent" />
      )}

      <div className="p-4 space-y-3">
        {/* Header — game crest, fixed 5v5, series format, status */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.09] bg-black/40">
            {session.gameSlug ? (
              <GameLogoImage
                gameName={session.gameSlug}
                catalogLogo={catalogGame?.logo}
                className="h-6 w-6 object-contain"
              />
            ) : (
              <span className="font-mono text-[9px] text-white/30">—</span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
              5v5 <span className="text-white/15">·</span> {bestOfLabel(session.bestOf)}
            </p>
            <p className="truncate text-[11px] text-white/30">
              {catalogGame?.name ?? session.gameSlug ?? 'Scrim'}
            </p>
          </div>
          <StatusPill
            label={session.status.replace('_', ' ')}
            tone={SESSION_TONE[session.status]}
          />
        </div>

        {/* Opponent + time */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-white/[0.05] text-[11px] font-semibold text-white/60">
            {opponentLogo ? (
              <img src={opponentLogo} alt="" className="h-full w-full object-contain p-1" />
            ) : (
              opponentName.slice(0, 2).toUpperCase()
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-heading text-[15px] font-bold leading-tight text-white">
              {opponentName}
            </p>
            <p className="mt-0.5 text-[12px] tabular-nums text-white/50">
              {formatSessionDate(session.scheduledAt)}
            </p>
          </div>
        </div>

        {/* Time collision */}
        {overlappingWith.length > 0 && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" aria-hidden />
            <p className="text-[11px] leading-snug text-amber-200/75">
              Overlaps your scrim with {overlappingWith.join(', ')}.
            </p>
          </div>
        )}

        {/* Opponent reported — quick confirm stays on the card (one tap to settle) */}
        {confirmPending && (
          <div className="border border-amber-500/25 bg-amber-500/[0.07] rounded-xl p-3 space-y-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-[12px] font-medium text-amber-300">
              {opponentName} reported {session.team1Score ?? '?'}–{session.team2Score ?? '?'}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="h-7 px-3 text-[12px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300"
              >
                {confirmMutation.isPending ? 'Confirming…' : 'Confirm result'}
              </Button>
              <Link
                to={`/competitive/scrims/sessions/${session.id}`}
                className="h-7 px-3 inline-flex items-center text-[12px] text-white/55 hover:text-white border border-white/[0.1] rounded-lg transition-colors"
              >
                Review in room
              </Link>
            </div>
          </div>
        )}

        {/* Phase cue lines */}
        {checkInOpen && (
          <div className="flex items-center gap-2 text-[12px] text-amber-300/90">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Check-in is open — check your whole team in from the room.</span>
          </div>
        )}
        {session.status === 'scheduled' && !checkInOpen && !confirmPending && iReported && (
          <p className={SCRIM_EYEBROW}>Waiting for opponent to confirm</p>
        )}

        {/* Actions — one primary, quiet secondaries */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1" />
          {session.status === 'scheduled' && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Cancel the scrim against ${opponentName}? This can't be undone.`)) {
                  cancelMutation.mutate();
                }
              }}
              disabled={anyPending}
              className="rounded-lg px-2.5 py-1 text-[11px] text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
            >
              {cancelMutation.isPending ? '…' : 'Cancel'}
            </button>
          )}
          {session.status === 'in_progress' && (
            <button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={anyPending}
              className="rounded-lg px-2.5 py-1 text-[11px] text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-30"
            >
              {completeMutation.isPending ? '…' : 'Mark complete'}
            </button>
          )}
          {session.status === 'disputed' && (
            <Link
              to={`/disputes?session=${session.id}`}
              className="rounded-lg px-2.5 py-1 text-[11px] text-white/55 hover:text-white border border-white/[0.08] transition-colors"
            >
              View dispute
            </Link>
          )}
          <Link
            to={`/competitive/scrims/sessions/${session.id}`}
            className={
              session.status === 'completed' || session.status === 'disputed'
                || session.status === 'cancelled'
                ? GHOST_CTA
                : ROSE_CTA
            }
          >
            {session.status === 'completed' || session.status === 'disputed'
              || session.status === 'cancelled'
              ? 'View result'
              : 'Open room'}
          </Link>
        </div>
      </div>
    </div>
  );
}
