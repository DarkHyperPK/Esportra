import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import { ScoreboardOcrDropzone } from '@/components/tournament/scoreboard-ocr/ScoreboardOcrDropzone';
import { useScrimParseScreenshot } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import type { ScrimScreenshotParseResult } from '@/types/competitive';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const EYEBROW = 'font-mono text-[10px] tracking-[0.28em] text-zinc-500 uppercase';
const GHOST =
  'text-[13px] border border-white/[0.08] text-white/55 hover:text-white rounded-none px-4 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

// ── ParseConfirmCard ──────────────────────────────────────────────────────────

function ParseConfirmCard({
  t1Name,
  t2Name,
  result,
  onConfirm,
  onReject,
}: {
  t1Name: string;
  t2Name: string;
  result: ScrimScreenshotParseResult;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const confident = result.confidence != null && result.confidence >= 0.8;
  const low = result.confidence != null && result.confidence < 0.6;

  const confidenceTone = low ? 'text-amber-400' : confident ? 'text-emerald-400' : 'text-zinc-400';
  const confidenceLabel =
    result.confidence != null
      ? `${Math.round(result.confidence * 100)}% confidence`
      : null;

  return (
    <div className="border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
      <p className={EYEBROW}>Parsed result — confirm before applying</p>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] text-white/40">{t1Name}</p>
          <p className="font-mono text-[28px] font-bold text-white tabular-nums leading-none">
            {result.team1Score ?? '?'}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[11px] text-white/40">{t2Name}</p>
          <p className="font-mono text-[28px] font-bold text-white tabular-nums leading-none">
            {result.team2Score ?? '?'}
          </p>
        </div>
      </div>

      {/* Confidence */}
      {confidenceLabel && (
        <p className={`text-[11px] ${confidenceTone}`}>{confidenceLabel}</p>
      )}

      {/* API message (e.g. low-confidence hint) */}
      {result.message && (
        <p className="text-[12px] text-white/45">{result.message}</p>
      )}

      {low && (
        <InlineNotice tone="warning">
          Confidence is low — check the scores before confirming.
        </InlineNotice>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button type="button" onClick={onReject} className={GHOST}>
          <XCircle className="h-3.5 w-3.5 inline mr-1.5" aria-hidden />
          Reject
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={result.team1Score == null || result.team2Score == null}
          className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-40 text-white text-[13px] px-4 py-1.5 rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Apply scores
        </button>
      </div>
    </div>
  );
}

// ── ScrimOcrUpload ────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  t1Name: string;
  t2Name: string;
  onFill: (team1Score: number, team2Score: number) => void;
}

/**
 * Upload scoreboard screenshot → parse → confirm card → fill scores.
 * Reuses ScoreboardOcrDropzone for the file pick UI.
 */
export function ScrimOcrUpload({ sessionId, t1Name, t2Name, onFill }: Props) {
  const parse = useScrimParseScreenshot(sessionId);
  const [parsed, setParsed] = useState<ScrimScreenshotParseResult | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setSizeError(null);
    if (file.size > MAX_FILE_BYTES) {
      setSizeError('Image must be 5 MB or smaller.');
      return;
    }
    setParsed(null);
    parse.mutate(file, {
      onSuccess: (result) => setParsed(result),
    });
  };

  const handleConfirm = () => {
    if (!parsed || parsed.team1Score == null || parsed.team2Score == null) return;
    onFill(parsed.team1Score, parsed.team2Score);
    setParsed(null);
    parse.reset();
  };

  const handleReject = () => {
    setParsed(null);
    parse.reset();
    setSizeError(null);
  };

  return (
    <div className="space-y-2">
      <p className={EYEBROW}>Upload scoreboard</p>

      {/* Only show dropzone when no parse is pending/done */}
      {!parse.isPending && !parsed && (
        <ScoreboardOcrDropzone disabled={parse.isPending} onFile={handleFile} />
      )}

      {sizeError && <InlineNotice tone="critical">{sizeError}</InlineNotice>}

      {parse.isPending && (
        <div className="border border-white/[0.06] bg-white/[0.02] px-4 py-5 flex items-center gap-3">
          <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin shrink-0" aria-hidden />
          <p className="text-[13px] text-white/55">Reading screenshot…</p>
        </div>
      )}

      {parse.isError && (
        <div className="space-y-2">
          <InlineNotice tone="critical">
            {getApiErrorMessage(parse.error, 'Could not read the screenshot. Enter scores manually or try a different image.')}
          </InlineNotice>
          <button type="button" onClick={handleReject} className={GHOST}>Try again</button>
        </div>
      )}

      {parsed && (
        <ParseConfirmCard
          t1Name={t1Name}
          t2Name={t2Name}
          result={parsed}
          onConfirm={handleConfirm}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
