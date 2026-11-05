import type { ReactNode } from 'react';
import type { SquadUpPublicStats } from '@/hooks/competitive/useSquadUpPublicStats';
import { HeroStage } from './HeroStage';
import { BuriedPost } from './BuriedPost';
import { LobbyScene } from './LobbyScene';
import { SquadUpTrust } from './SquadUpTrust';
import '../shared/squad-up-shared.css';
import '../demo/demo.css';
import './landing.css';

/** The public Squad Up page: anyone can read it and play with the sample deck; going live needs an account. */
export function SquadUpLanding({ stats, action }: { stats?: SquadUpPublicStats; action: ReactNode }) {
  return (
    <div className="su-page">
      <HeroStage stats={stats} action={action} />
      <div className="su-wrap">
        <BuriedPost />
        <LobbyScene />
        <SquadUpTrust />
        <section className="su-closing" aria-labelledby="su-closing-title">
          <p className="su-caption"><span className="su-dot" aria-hidden /> On air now</p>
          <h2 id="su-closing-title">Your next five-stack is already online.</h2>
          {action}
        </section>
      </div>
    </div>
  );
}
