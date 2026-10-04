import { cn } from '@/lib/utils';
import { EYEBROW_CLASS, InlineNotice } from '@/components/ui/kit';
import { countRecognisedAgents, describeOcrEngine } from '@/services/scoreboardOcr';
import type { OcrField, ScoreboardOcrResult } from '@/types/scoreboardOcr';

const LOW = 0.6;

function Stat({ label, field, format }: { label: string; field: OcrField<string | number>; format?: (v: string | number) => string }) {
  const low = field.value === null || field.confidence < LOW;
  return (
    <div className={cn('border px-3 py-2', low ? 'border-amber-400/40 bg-amber-400/[0.05]' : 'border-white/[0.07] bg-black/20')}>
      <p className={EYEBROW_CLASS}>{label}</p>
      <p className="font-heading text-lg font-bold tabular-nums text-white">{field.value === null ? '—' : format ? format(field.value) : field.value}</p>
      <p className="font-mono text-[11px] text-zinc-500">conf {field.confidence.toFixed(2)}</p>
    </div>
  );
}

/** Everything above the table: outcome, score, map, team vote, timing and warnings. */
export function OcrDebugSummary({ result, elapsedMs }: { result: ScoreboardOcrResult; elapsedMs: number }) {
  const agents = countRecognisedAgents(result);
  const rows = result.players.length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <Stat label="Outcome" field={result.outcome} format={(v) => String(v).toUpperCase()} />
        <Stat label="Ally score" field={result.allyScore} />
        <Stat label="Enemy score" field={result.enemyScore} />
        <Stat label="Map" field={{ value: result.map.value?.name ?? null, confidence: result.map.confidence }} />
        <Stat label="Ally team" field={result.allyTeam} />
        <div className={cn('border px-3 py-2', agents < rows ? 'border-amber-400/40 bg-amber-400/[0.05]' : 'border-white/[0.07] bg-black/20')}>
          <p className={EYEBROW_CLASS}>Agents recognised</p>
          <p className="font-heading text-lg font-bold tabular-nums text-white">{agents} / {rows}</p>
          <p className="font-mono text-[11px] text-zinc-500">icons need valorant-api</p>
        </div>
        <div className="border border-white/[0.07] bg-black/20 px-3 py-2">
          <p className={EYEBROW_CLASS}>Read time</p>
          <p className="font-heading text-lg font-bold tabular-nums text-white">{(elapsedMs / 1000).toFixed(1)} s</p>
          <p className="font-mono text-[11px] text-zinc-500">{rows} rows · {describeOcrEngine(result.engineVersion)}</p>
        </div>
      </div>
      {result.warnings.length > 0 ? (
        <InlineNotice tone="warning" title={`${result.warnings.length} warning${result.warnings.length === 1 ? '' : 's'}`}>
          <ul className="space-y-0.5 font-mono text-xs">
            {result.warnings.map((w, i) => (
              <li key={`${w.code}-${i}`}>
                <span className="text-amber-200">{w.code}</span>
                {w.playerIndex != null && <span className="text-zinc-500"> · row {w.playerIndex + 1}</span>} — {w.message}
              </li>
            ))}
          </ul>
        </InlineNotice>
      ) : (
        <InlineNotice tone="success">No warnings.</InlineNotice>
      )}
    </div>
  );
}
