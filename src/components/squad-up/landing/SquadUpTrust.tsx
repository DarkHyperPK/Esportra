import { BadgeCheck, Clock3, EyeOff, Flag, Lock } from 'lucide-react';

const SAFETY = [
  { icon: BadgeCheck, title: 'Real Riot accounts', body: 'Only players with a linked Riot account can join. Rank and stats come from their matches.' },
  { icon: Clock3, title: 'Gone when idle', body: 'Close the tab for 3 minutes or stop swiping for 10, and you leave the pool automatically.' },
  { icon: Flag, title: 'Report with proof', body: 'Report a player with screenshots. Moderators review it and can remove them from Squad Up.' },
  { icon: EyeOff, title: 'Hide anyone', body: 'Hidden players never appear to you again, and you never appear to them.' },
];

const FAQ = [
  { q: 'Why don\'t I see players from other servers?', a: 'Valorant only lets you party with players on the same server region (for example AP or EU). Squad Up only shows you people you can actually queue with, then lets you narrow it down by country.' },
  { q: 'What happens if I tab out to play?', a: 'Nothing for 3 minutes. After that, or after 10 minutes without swiping, you drop out of the pool so nobody matches with someone who is gone. Start again any time.' },
  { q: 'Who sees my reports?', a: 'Only Esportra moderators. The player you report is never told who reported them.' },
  { q: 'Does it cost anything?', a: 'No. Squad Up is free with your Esportra account.' },
];

/** Safety, supported games and short answers. */
export function SquadUpTrust() {
  return (
    <>
      <section className="su-section" aria-labelledby="su-safety-title">
        <h2 id="su-safety-title">Built to keep lobbies clean</h2>
        <ul className="su-safety">
          {SAFETY.map(({ icon: Icon, title, body }) => (
            <li key={title}><Icon size={20} aria-hidden /><h3>{title}</h3><p>{body}</p></li>
          ))}
        </ul>
      </section>
      <section className="su-section" aria-labelledby="su-games-title">
        <h2 id="su-games-title">Games</h2>
        <ul className="su-games">
          <li className="su-game-live"><img src="/games/valorant-logo.png" alt="" /><strong>Valorant</strong><span><span className="su-dot" aria-hidden /> Live now</span></li>
          {[1, 2, 3].map((n) => (
            <li key={n} className="su-game-soon"><Lock size={18} aria-hidden /><strong>More games coming</strong><span>Next title soon</span></li>
          ))}
        </ul>
      </section>
      <section className="su-section su-faq" aria-labelledby="su-faq-title">
        <h2 id="su-faq-title">Questions</h2>
        {FAQ.map((item) => (
          <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>
        ))}
      </section>
    </>
  );
}
