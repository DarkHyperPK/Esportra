import type { ReactNode } from 'react';
import type { SquadUpPublicStats } from '@/hooks/competitive/useSquadUpPublicStats';
import { SquadUpDemo } from '../demo/SquadUpDemo';

interface SquadUpHeroProps {
  stats?: SquadUpPublicStats;
  /** The primary call to action (start, sign in, or "opening soon"). */
  action: ReactNode;
}

/** Headline on the problem we solve, live counters, and the demo players can try right away. */
export function SquadUpHero({ stats, action }: SquadUpHeroProps) {
  return (
    <section className="su-hero" aria-labelledby="su-hero-title">
      <div className="su-hero-copy">
        <p className="su-hero-live">
          <span className="su-dot" aria-hidden />
          {stats && stats.playersLive > 0 ? `${stats.playersLive} players looking right now` : 'Live teammate finder for Valorant'}
        </p>
        <h1 id="su-hero-title">Fill your lobby before Discord replies.</h1>
        <p className="su-hero-lead">
          Squad Up shows you Valorant players who are online now, in the countries you choose and near your rank.
          Swipe for a duo, or open a lobby and fill all five slots. Anyone who goes quiet drops out, so everyone you see is ready to queue.
        </p>
        <div className="su-hero-actions">
          {action}
          <a className="su-link" href="#how-it-works">How it works</a>
        </div>
        {stats && (
          <dl className="su-livebar" aria-label="Squad Up right now">
            <div><dt>Looking now</dt><dd>{stats.playersLive}</dd></div>
            <div><dt>Open lobbies</dt><dd>{stats.openLobbies}</dd></div>
            <div><dt>Matches today</dt><dd>{stats.matchesToday}</dd></div>
          </dl>
        )}
      </div>
      <div className="su-hero-demo">
        <SquadUpDemo />
      </div>
    </section>
  );
}
