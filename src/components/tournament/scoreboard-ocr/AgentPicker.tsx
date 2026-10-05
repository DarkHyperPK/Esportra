import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { agentIcon, type AgentChoice } from '@/services/scoreboardOcr';

interface Props {
  agentId: string | null;
  agentName: string | null;
  choices: AgentChoice[];
  /** The reader wasn't sure: an amber ring until the captain picks. */
  uncertain: boolean;
  playerLabel: string;
  onPick: (agentId: string | null, agentName: string) => void;
}

function AgentTile({ icon, name, className }: { icon: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return icon && !failed ? (
    <img src={icon} alt="" className={cn('h-full w-full object-cover', className)} loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <span className={cn('flex h-full w-full items-center justify-center font-mono text-xs font-bold text-zinc-400', className)} aria-hidden>
      {name ? name.slice(0, 2).toUpperCase() : '?'}
    </span>
  );
}

/** The row's agent as its portrait; opens a grid of agent icons to change it. */
export function AgentPicker({ agentId, agentName, choices, uncertain, playerLabel, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const icon = agentIcon(choices, agentId, agentName);
  const current = agentName ?? choices.find((c) => c.agentId === agentId)?.name ?? '';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${playerLabel} agent: ${current || 'unknown'}. Change agent`}
          title={current || 'Unknown agent'}
          className={cn(
            'h-8 w-8 shrink-0 overflow-hidden border bg-black/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            uncertain ? 'border-amber-400/80' : 'border-white/10 hover:border-white/30',
          )}
        >
          <AgentTile icon={icon} name={current} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-none border-white/10 bg-zinc-950 p-2">
        <p className="px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Agent for {playerLabel}</p>
        <div className="grid grid-cols-6 gap-1" role="listbox" aria-label={`Agent for ${playerLabel}`}>
          {choices.map((choice) => {
            const selected = choice.agentId ? choice.agentId === agentId : choice.name === agentName && !agentId;
            return (
              <button
                key={choice.key}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={choice.name}
                title={choice.name}
                onClick={() => {
                  onPick(choice.agentId, choice.name);
                  setOpen(false);
                }}
                className={cn(
                  'relative h-9 w-9 overflow-hidden border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                  selected ? 'border-white' : 'border-white/10 hover:border-white/40',
                )}
              >
                <AgentTile icon={choice.icon} name={choice.name} />
                {selected ? (
                  <Check className="absolute bottom-0 right-0 h-3 w-3 bg-white text-black" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
