import { useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { ScrimRiotMatchPicker } from '@/components/competitive/scrims/ScrimRiotMatchPicker';
import { ScrimOcrUpload } from '@/components/competitive/scrims/ScrimOcrUpload';
import { useReportScrimResult } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { bestOfLongLabel, seriesOutcomeHint, validSeriesOutcomes, winsNeeded } from '@/services/scrimUtils';
import { ROOM_EYEBROW, ROOM_FIELD, ROOM_GHOST } from './roomStyles';

export function ScrimReportForm({
  sessionId, gameSlug, bestOf, myTeamId, t1Name, t2Name, defaultT1, defaultT2, onSuccess, onCancel,
}: {
  sessionId: string; gameSlug: string | null; bestOf: number;
  myTeamId: string | null;
  t1Name: string; t2Name: string; defaultT1: string; defaultT2: string;
  onSuccess: () => void; onCancel: () => void;
}) {
  const report = useReportScrimResult(sessionId);
  const [s1, setS1] = useState(defaultT1);
  const [s2, setS2] = useState(defaultT2);
  const [notes, setNotes] = useState('');
  const [manual, setManual] = useState(false);
  const isValorant = gameSlug === 'valorant';

  function fillScores(team1Score: number, team2Score: number) {
    setS1(String(team1Score));
    setS2(String(team2Score));
  }

  async function submit() {
    if (!myTeamId) return;
    const n1 = Number(s1), n2 = Number(s2);
    if (isNaN(n1) || isNaN(n2)) return;
    try {
      await report.mutateAsync({ reportingTeamId: myTeamId, team1Score: n1, team2Score: n2, notes: notes.trim() || undefined });
      onSuccess();
    } catch { /* shown via report.isError */ }
  }

  // Series presets — every legal outcome of the listing's format, one tap each.
  const presets = validSeriesOutcomes(bestOf);
  const need = winsNeeded(bestOf);

  return (
    <div className="space-y-4">
      {/* Riot match picker — Valorant only */}
      {isValorant && (
        <div className="border border-white/[0.05] bg-black/20 p-3 space-y-2">
          <ScrimRiotMatchPicker
            sessionId={sessionId}
            isValorant={isValorant}
            onFill={fillScores}
          />
        </div>
      )}

      {/* Screenshot OCR upload */}
      <div className="border border-white/[0.05] bg-black/20 p-3">
        <ScrimOcrUpload
          sessionId={sessionId}
          t1Name={t1Name}
          t2Name={t2Name}
          onFill={fillScores}
        />
      </div>

      {/* Series result — presets first, manual entry underneath */}
      <div className="space-y-3">
        <p className={ROOM_EYEBROW}>
          {bestOfLongLabel(bestOf).toUpperCase()} · {seriesOutcomeHint(bestOf).toUpperCase()}
        </p>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${presets.length}, minmax(0, 1fr))` }}>
          {presets.map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              type="button"
              aria-label={`${t1Name} ${a} – ${b} ${t2Name}`}
              aria-pressed={s1 === String(a) && s2 === String(b)}
              onClick={() => { setS1(String(a)); setS2(String(b)); }}
              className={`border px-2 py-2.5 transition-colors ${
                s1 === String(a) && s2 === String(b)
                  ? 'border-white/40 bg-white/10'
                  : 'border-white/[0.08] bg-black/30 hover:border-white/25'
              }`}
            >
              <span className="font-mono text-[18px] font-bold text-white tabular-nums">
                {a} – {b}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-white/30">
          {t1Name} vs {t2Name}. The winner closes the series at {need} win{need === 1 ? '' : 's'}.
        </p>
        {manual && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label htmlFor="rs1" className="block text-[11px] text-white/55">{t1Name}</label>
              <input id="rs1" type="number" min={0} value={s1} onChange={(e) => setS1(e.target.value)} className={ROOM_FIELD} />
            </div>
            <div className="space-y-1">
              <label htmlFor="rs2" className="block text-[11px] text-white/55">{t2Name}</label>
              <input id="rs2" type="number" min={0} value={s2} onChange={(e) => setS2(e.target.value)} className={ROOM_FIELD} />
            </div>
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="rnotes" className="block text-[11px] text-white/55">Notes</label>
          <textarea id="rnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/30 transition-colors resize-none" />
        </div>
      </div>

      {report.isError && <InlineNotice tone="critical">{getApiErrorMessage(report.error, 'Could not submit result. Try again.')}</InlineNotice>}
      <div className="flex gap-3">
        <button onClick={onCancel} className={ROOM_GHOST}>Cancel</button>
        {!manual && (
          <button onClick={() => setManual(true)} className={ROOM_GHOST}>Enter manually</button>
        )}
        <button
          onClick={submit}
          disabled={report.isPending || !s1 || !s2}
          className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50  text-[13px] px-4 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {report.isPending ? 'Submitting…' : 'Submit result'}
        </button>
      </div>
    </div>
  );
}

