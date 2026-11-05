import { Check } from 'lucide-react';

const NOISE = [
  'anyone up for unrated??', 'LF1 imm+ only', 'selling acc dm', 'LF3 casual no rage', 'who wants customs', 'need sage asap',
  'gold lobby 2 spots', 'any EU?', 'lf duo rr grind', 'LF2M comp plat+', 'dm me for boosting', 'anyone 5 stack later?',
];

/**
 * Why Squad Up exists, shown rather than told: in a busy server chat your post scrolls out of sight in seconds;
 * here one swipe from the right player opens the chat. Pure CSS motion; static under reduced motion.
 */
export function BuriedPost() {
  const feed = [...NOISE.slice(0, 5), 'you: LF2M ranked plat, PK, mic', ...NOISE.slice(5)];
  return (
    <section className="su-buried" aria-labelledby="su-buried-title">
      <h2 id="su-buried-title">Your post sinks. Your match doesn't.</h2>
      <div className="su-buried-grid">
        <figure className="su-buried-chat" aria-label="A busy server chat where your post scrolls away">
          <figcaption className="su-caption"># lfg-valorant · 2,481 online</figcaption>
          <div className="su-buried-window" aria-hidden>
            <ul>
              {[...feed, ...feed].map((line, index) => (
                <li key={`${line}-${index}`} className={line.startsWith('you:') ? 'is-you' : ''}>{line}</li>
              ))}
            </ul>
          </div>
          <p>Six servers, one post each, and it is gone before anyone reads it.</p>
        </figure>
        <figure className="su-buried-match" aria-label="On Squad Up, a match opens a chat">
          <figcaption className="su-caption"><span className="su-dot" aria-hidden /> Squad Up</figcaption>
          <div className="su-buried-card">
            <span className="su-buried-check" aria-hidden><Check size={22} /></span>
            <strong>You and Noor want to play.</strong>
            <span>Chat open · Riot ID pinned · Platinum 2 · Mic on</span>
          </div>
          <p>One page. Everyone on it is online, on your server, and said yes.</p>
        </figure>
      </div>
    </section>
  );
}
