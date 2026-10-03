import { Textarea } from '@/components/ui/textarea';
import { HINT_CLASS, LABEL_CLASS } from '@/components/ui/kit';

interface Props {
  team1: string;
  team2: string;
  onChange: (team: 'team1' | 'team2', value: string) => void;
}

const FIELD = 'min-h-[7rem] rounded-none border-white/10 bg-black/30 font-mono text-[13px] text-white placeholder:text-zinc-600';

/** Optional rosters so name matching and the team1/team2 vote can be tested too. */
export function OcrRosterInputs({ team1, team2, onChange }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {(['team1', 'team2'] as const).map((team) => (
        <label key={team} className="space-y-1.5">
          <span className={LABEL_CLASS}>{team === 'team1' ? 'Team 1 names' : 'Team 2 names'} <span className="text-zinc-500">(optional)</span></span>
          <Textarea
            value={team === 'team1' ? team1 : team2}
            onChange={(event) => onChange(team, event.target.value)}
            placeholder={team === 'team1' ? 'tr1ck\nKenshiro\nCryogeyser' : 'AHK\nosa1d\nShiniGhanee'}
            className={FIELD}
          />
        </label>
      ))}
      <p className={`${HINT_CLASS} sm:col-span-2`}>One in-game name per line. Leave empty to test reading only.</p>
    </div>
  );
}
