// Esportra Broadcast (HUD tool) UI/UX screens. Spec: design/hud-studio/README.md
import * as web from '../hud/web.mjs';

const S = (id, fn, description, opts = {}) => ({ id: `hud/${id}`, out: `hud-studio/${id}.png`, w: opts.w ?? 1600, h: opts.h ?? 1000, html: fn, description, tags: ['hud', 'broadcast', ...(opts.tags ?? [])], direction: 'command console' });

export default [
  S('web-01-home', web.home, 'Web · Broadcast home: live shows with autopilot state, the queue built from the schedule, production nodes, alerts.', { tags: ['web'] }),
  S('web-02-show-setup', web.showSetup, 'Web · Show setup step 2: HUD pack, theme, and teams synced from the tournament.', { tags: ['web'] }),
  S('web-03-rundown', web.rundown, 'Web · Rundown and rules: segments driven by tournament state, each with graphics, OBS scene and hold window; rule editor with test fire.', { tags: ['web', 'automation'] }),
  S('web-04-live-monitor', web.liveMonitor, 'Web · Live monitor: every node on air with PGM/PVW, autopilot countdown, remote hold/take, node chat and incidents.', { tags: ['web'] }),
];
