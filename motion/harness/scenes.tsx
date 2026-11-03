import type { ComponentType } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { Route } from './mockFetch';
import ScrimDiscoveryPage from '@/pages/competitive/scrims/ScrimDiscoveryPage';
import { discoveryRoutes } from './fixtures/discovery';
import ScrimDataPage from '@/pages/competitive/scrims/ScrimDataPage';
import { insightsRoutes } from './fixtures/insights';
import ScrimSessionPage from '@/pages/competitive/ScrimSessionPage';
import { createRoom, ROOM_SESSION_ID, type RoomStage } from './fixtures/room';

const room = (stage: RoomStage): Scene => ({
  path: `/competitive/scrims/sessions/${ROOM_SESSION_ID}`,
  route: '/competitive/scrims/sessions/:id',
  Component: ScrimSessionPage,
  routes: () => createRoom(stage).routes,
});

export interface Scene {
  path: string;
  route: string;
  Component: ComponentType;
  routes: () => Route[];
  seed?: (qc: QueryClient) => void;
  width?: number;
}

export const SCENES: Record<string, Scene> = {
  discovery: {
    path: '/competitive/scrims',
    route: '/competitive/scrims',
    Component: ScrimDiscoveryPage,
    routes: () => discoveryRoutes,
  },
  insights: {
    path: '/competitive/scrims/data',
    route: '/competitive/scrims/data',
    Component: ScrimDataPage,
    routes: () => insightsRoutes,
  },
  'room-time': room('time'),
  'room-checkin': room('checkin'),
  'room-veto': room('veto'),
  'room-report': room('report'),
};
