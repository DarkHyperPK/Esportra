import type { ComponentType } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { Route } from './mockFetch';
import ScrimDiscoveryPage from '@/pages/competitive/scrims/ScrimDiscoveryPage';
import ScrimWorkspacePage from '@/pages/competitive/scrims/ScrimWorkspacePage';
import ScrimSessionPage from '@/pages/competitive/ScrimSessionPage';
import ScrimDataPage from '@/pages/competitive/scrims/ScrimDataPage';
import { discoveryRoutes } from './fixtures/discovery';
import { insightsRoutes } from './fixtures/insights';
import { createRoom, ROOM_SESSION_ID } from './fixtures/room';
import { createWorkspace } from './fixtures/workspace';

export interface Scene {
  path: string;
  route: string;
  Component: ComponentType;
  routes: () => Route[];
  control?: Record<string, () => void>;
  seed?: (qc: QueryClient) => void;
  width?: number;
}

// One fixture instance per page load, shared by its routes and its controls.
const once = <T,>(make: () => T) => { let v: T | null = null; return () => (v ??= make()); };
const room = once(createRoom);
const workspace = once(createWorkspace);

export const SCENES: Record<string, Scene> = {
  discovery: {
    path: '/competitive/scrims',
    route: '/competitive/scrims',
    Component: ScrimDiscoveryPage,
    routes: () => discoveryRoutes,
  },
  workspace: {
    path: '/competitive/scrims/workspace',
    route: '/competitive/scrims/workspace',
    Component: ScrimWorkspacePage,
    routes: () => workspace().routes,
    get control() { return workspace().control; },
  },
  room: {
    path: `/competitive/scrims/sessions/${ROOM_SESSION_ID}`,
    route: '/competitive/scrims/sessions/:id',
    Component: ScrimSessionPage,
    routes: () => room().routes,
    get control() { return room().control; },
  },
  insights: {
    path: '/competitive/scrims/data',
    route: '/competitive/scrims/data',
    Component: ScrimDataPage,
    routes: () => insightsRoutes,
  },
};
