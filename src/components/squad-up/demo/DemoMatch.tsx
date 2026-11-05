import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import type { SlatePlayer } from '../shared/slate';

/** The match moment inside the demo monitor. In the real product this opens a chat with their Riot ID. */
export function DemoMatch({ player, onClose }: { player: SlatePlayer; onClose: () => void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => { button.current?.focus(); }, []);
  return (
    <div className="su-demo-match" role="dialog" aria-modal="false" aria-labelledby="su-demo-match-title">
      <div className="su-demo-match-inner">
        <p className="su-caption"><span className="su-dot" aria-hidden /> Live match</p>
        <h3 id="su-demo-match-title">You and {player.name} want to play.</h3>
        <p>In the real thing, a chat opens with their Riot ID <strong>{player.riotId}</strong> pinned at the top. Add them in-game and send the party code.</p>
        <div className="su-demo-chat" aria-hidden>
          <span className="su-demo-bubble su-demo-bubble-them">gg, I'm on. {player.roles?.[0] ?? 'Flex'} ok?</span>
          <span className="su-demo-bubble su-demo-bubble-you">perfect, inviting you now</span>
        </div>
        <CommandButton ref={button} variant="primary" size="md" slide onClick={onClose}>
          <MessageSquare size={14} aria-hidden /> Keep swiping
        </CommandButton>
      </div>
    </div>
  );
}
