import { useState } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { InlineNotice } from '@/components/ui/kit';
import { useConfirmScrimResult } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { bestOfLongLabel, normalizeBestOf, seriesOutcomeHint } from '@/services/scrimUtils';
import { ScrimReportForm } from './ScrimReportForm';
import { ScrimDisputeForm } from './ScrimDisputeForm';
import { ROOM_EYEBROW, ROOM_GHOST, ROOM_PANEL } from './roomStyles';
import type { ScrimSession } from '@/types/competitive';

export function ScrimResultPanel({ session, myTeamId, myTeamSide }: { session: ScrimSession; myTeamId: string | null; myTeamSide: 1 | 2 | null }) {
  const confirm = useConfirmScrimResult(session.id);
  const reduce = useReducedMotion();
  const [showReport, setShowReport] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const t1Name = session.team1Name ?? 'Team 1';
  const t2Name = session.team2Name ?? 'Team 2';
  const bo = normalizeBestOf(session.bestOf);
  const opponentName = myTeamSide === 1 ? t2Name : t1Name;
  const myReported = (myTeamSide === 1 && session.resultReportedByTeam1) || (myTeamSide === 2 && session.resultReportedByTeam2);
  const oppReported = (myTeamSide === 1 && session.resultReportedByTeam2) || (myTeamSide === 2 && session.resultReportedByTeam1);
  const bothReported = session.resultReportedByTeam1 && session.resultReportedByTeam2;
  const score = session.team1Score != null && session.team2Score != null ? `${session.team1Score} – ${session.team2Score}` : null;
  const arrive = reduce ? {} : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 } };

  if (session.status === 'disputed') {
    return (
      <div className={ROOM_PANEL}>
        <p className={ROOM_EYEBROW}>Result</p>
        <InlineNotice tone="warning">
          Staff will rule on the dispute. The outcome is added to both team records.
        </InlineNotice>
      </div>
    );
  }

  // Sub-state C: opponent reported a series score we haven't signed off yet.
  const opponentReportScore =
    oppReported && !myReported && session.team1Score != null && session.team2Score != null
      ? `${session.team1Score} – ${session.team2Score}`
      : null;

  return (
    <div className={ROOM_PANEL}>
      <p className={ROOM_EYEBROW}>Result</p>
      {!bothReported && (
        <p className="text-[12px] text-white/40">
          {bestOfLongLabel(bo)} series — {seriesOutcomeHint(bo).toLowerCase()}
        </p>
      )}

      {/* Sub-state D */}
      {bothReported && (
        <div className="space-y-3">
          {score && <p className="font-mono text-[24px] font-bold text-white tabular-nums">{score}</p>}
          <InlineNotice tone="success">Result confirmed.</InlineNotice>
        </div>
      )}

      {/* Sub-state C */}
      {!bothReported && oppReported && !myReported && (
        <div className="space-y-3">
          <InlineNotice tone="warning">{opponentName} reported a series result.</InlineNotice>
          {opponentReportScore && <div className="space-y-1"><p className="text-[12px] text-white/40">Their report:</p><p className="font-mono text-[20px] text-white tabular-nums">{opponentReportScore}</p></div>}
          {confirm.isError && <p role="alert" className="text-[12px] text-red-300">{getApiErrorMessage(confirm.error, 'Could not confirm. Try again.')}</p>}
          {!showDispute && (
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => confirm.mutate()} disabled={confirm.isPending} className="border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 text-[13px] rounded-lg px-4 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors">
                {confirm.isPending ? 'Confirming…' : 'Confirm result'}
              </button>
              <button onClick={() => setShowDispute(true)} className="text-amber-400/70 hover:text-amber-400 border border-amber-500/20 text-[13px] rounded-lg px-4 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors">
                Raise dispute
              </button>
            </div>
          )}
          <AnimatePresence>
            {showDispute && (
              <motion.div key="df" className="border border-white/10 bg-black/30 p-4" {...arrive}>
                <ScrimDisputeForm sessionId={session.id} myTeamId={myTeamId} onCancel={() => setShowDispute(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sub-state B */}
      {!bothReported && myReported && !oppReported && (
        <div className="space-y-3">
          {score && <div className="space-y-1"><p className="text-[13px] text-white/55">You reported:</p><p className="font-mono text-[20px] text-white tabular-nums">{score}</p></div>}
          <InlineNotice tone="neutral">Waiting for {opponentName} to confirm.</InlineNotice>
          {!showReport && <button onClick={() => setShowReport(true)} className={ROOM_GHOST}>Edit result</button>}
          <AnimatePresence>
            {showReport && (
              <motion.div key="rf" {...arrive}>
                <ScrimReportForm sessionId={session.id} gameSlug={session.gameSlug} bestOf={bo} myTeamId={myTeamId} t1Name={t1Name} t2Name={t2Name} defaultT1={String(session.team1Score ?? '')} defaultT2={String(session.team2Score ?? '')} onSuccess={() => setShowReport(false)} onCancel={() => setShowReport(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Sub-state A */}
      {!myReported && !oppReported && !bothReported && (
        <div className="space-y-3">
          <p className="text-[13px] text-white/40">Report the series result when your session ends.</p>
          {!showReport && <button onClick={() => setShowReport(true)} className={ROOM_GHOST}>Report result</button>}
          <AnimatePresence>
            {showReport && (
              <motion.div key="rf" {...arrive}>
                <ScrimReportForm sessionId={session.id} gameSlug={session.gameSlug} bestOf={bo} myTeamId={myTeamId} t1Name={t1Name} t2Name={t2Name} defaultT1="" defaultT2="" onSuccess={() => setShowReport(false)} onCancel={() => setShowReport(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
