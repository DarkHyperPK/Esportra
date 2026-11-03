import React from 'react';
import { PlayerCareerPanel } from '@/components/competitive/career/PlayerCareerPanel';

/** The profile's "Performance" tab: the player's verified competitive record. */
export function PerformanceTab({ profileId }: { profileId: string }): React.JSX.Element {
  return <PlayerCareerPanel userId={profileId} />;
}
