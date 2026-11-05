import type { ReactNode } from 'react';
import type { SquadUpPublicStats } from '@/hooks/competitive/useSquadUpPublicStats';
import { SquadUpHero } from './SquadUpHero';
import { SquadUpStory } from './SquadUpStory';
import { SquadUpTrust } from './SquadUpTrust';
import '../shared/squad-up-shared.css';
import './landing.css';

/** The public Squad Up page: anyone can read it and try the demo; starting for real needs an account. */
export function SquadUpLanding({ stats, action }: { stats?: SquadUpPublicStats; action: ReactNode }) {
  return (
    <div className="su-page">
      <div className="su-wrap">
        <SquadUpHero stats={stats} action={action} />
        <SquadUpStory />
        <SquadUpTrust />
        <section className="su-closing" aria-labelledby="su-closing-title">
          <h2 id="su-closing-title">Your next five-stack is online right now.</h2>
          {action}
        </section>
      </div>
    </div>
  );
}
