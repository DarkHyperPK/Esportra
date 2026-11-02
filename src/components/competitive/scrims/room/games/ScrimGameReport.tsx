import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ScrimAutoFetch } from './ScrimAutoFetch';
import { ScrimManualReport } from './ScrimManualReport';
import { ScrimScreenshotReport } from './ScrimScreenshotReport';

type Method = 'riot' | 'screenshot' | 'manual';

interface Props {
  sessionId: string;
  gameNumber: number;
  myTeamId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  team1Logo?: string;
  team2Logo?: string;
  isValorant: boolean;
  onDone: () => void;
  /** Show a Close control (an edit of an already reported map). */
  closable?: boolean;
}

const TAB = 'min-h-[36px] rounded-lg px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

/** Three ways to report one map: Riot history, a scoreboard screenshot, or typed in. */
export function ScrimGameReport(props: Props) {
  const { isValorant, gameNumber, onDone, closable = false } = props;
  const [method, setMethod] = useState<Method>(isValorant ? 'riot' : 'manual');
  const options: Array<{ id: Method; label: string }> = isValorant
    ? [{ id: 'riot', label: 'Auto-fetch' }, { id: 'screenshot', label: 'Upload screenshot' }, { id: 'manual', label: 'Enter manually' }]
    : [{ id: 'manual', label: 'Enter manually' }];

  return (
    <div className="space-y-4 rounded-lg border border-white/[0.08] bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-white">Report game {gameNumber}</p>
        {closable && <button type="button" onClick={onDone} className="text-[12px] text-white/45 hover:text-white">Close</button>}
      </div>
      {options.length > 1 && (
        <div role="tablist" aria-label="How to report" className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={method === o.id}
              onClick={() => setMethod(o.id)}
              className={cn(TAB, method === o.id ? 'bg-white/[0.12] text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white')}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {method === 'riot' && (
        <ScrimAutoFetch sessionId={props.sessionId} gameNumber={gameNumber} myTeamId={props.myTeamId} team1Id={props.team1Id} team2Id={props.team2Id} onDone={onDone} />
      )}
      {method === 'screenshot' && (
        <ScrimScreenshotReport {...props} onManual={() => setMethod('manual')} />
      )}
      {method === 'manual' && (
        <ScrimManualReport sessionId={props.sessionId} gameNumber={gameNumber} myTeamId={props.myTeamId} team1Name={props.team1Name} team2Name={props.team2Name} onDone={onDone} />
      )}
    </div>
  );
}
