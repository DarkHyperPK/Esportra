// Esportra Broadcast (HUD tool) UI/UX screens. Spec: design/hud-studio/README.md
import * as web from '../hud/web.mjs';
import * as desk from '../hud/desktop.mjs';
import * as desk2 from '../hud/desktop2.mjs';
import * as sys from '../hud/system.mjs';

const S = (id, fn, description, opts = {}) => ({ id: `hud/${id}`, out: `hud-studio/${id}.png`, w: opts.w ?? 1600, h: opts.h ?? 1000, html: fn, description, tags: ['hud', 'broadcast', ...(opts.tags ?? [])], direction: 'command console' });

export default [
  S('web-01-home', web.home, 'Web · Broadcast home: live shows with autopilot state, the queue built from the schedule, production nodes, alerts.', { tags: ['web'] }),
  S('web-02-show-setup', web.showSetup, 'Web · Show setup step 2: HUD pack, theme, and teams synced from the tournament.', { tags: ['web'] }),
  S('web-03-rundown', web.rundown, 'Web · Rundown and rules: segments driven by tournament state, each with graphics, OBS scene and hold window; rule editor with test fire.', { tags: ['web', 'automation'] }),
  S('web-04-live-monitor', web.liveMonitor, 'Web · Live monitor: every node on air with PGM/PVW, autopilot countdown, remote hold/take, node chat and incidents.', { tags: ['web'] }),
  S('web-05-crew-links', web.crewLinks, 'Web · Crew & links: roles, invites, tokenised browser sources with OBS tally, one-click OBS scene build, co-stream links.', { tags: ['web'] }),
  S('web-06-report', web.report, 'Web · Post-show report: on-air and automation stats, sponsor proof, VOD chapters, results sent to the bracket, incidents.', { tags: ['web'] }),
  S('desk-07-pair-readiness', desk.pair, 'Desktop · Pair and readiness: node pairing code, show and match pick, readiness checklist (GEP, OBS, scenes, sources, internet).', { tags: ['desktop'] }),
  S('desk-08-console', desk.console_, 'Desktop · Producer console: PVW/PGM from OBS, Take/Cut/Stinger, autopilot now/next with hold countdown, graphic layers with hotkeys, trigger pad, live data, event log.', { tags: ['desktop', 'automation'] }),
  S('desk-09-scenes', desk2.scenes, 'Desktop · OBS/vMix: connection, one-click scene build with slots for your own sources, segment → scene map, transitions and replay buffer.', { tags: ['desktop', 'obs'] }),
  S('desk-10-capture', desk2.capture, 'Desktop · Capture: GEP feature status and freshness, fallbacks for missing fields, optional player PCs, live state, simulator.', { tags: ['desktop', 'data'] }),
  S('desk-11-observer', desk2.observer, 'Desktop · Observer PC in capture-only mode: sends GEP to the production PC, hotkeys, no show controls.', { tags: ['desktop', 'data'] }),
  S('desk-12-outputs', desk2.outputs, 'Desktop · Outputs: every browser source served by the node with live preview, connections, URL and frame health.', { tags: ['desktop', 'obs'] }),
  S('desk-13-data-fix', desk2.dataFix, 'Desktop · Fix data drawer: score, names, sides and series with an optional bracket correction and history.', { tags: ['desktop', 'data'] }),
  S('desk-14-offline-sync', desk2.offline, 'Desktop · Offline: the show keeps running locally, queued sync, and a conflict resolver when the connection returns.', { tags: ['desktop', 'states'] }),
  S('sys-15-how-it-works', sys.howItWorks, 'System · How it works: web ↔ production node ↔ OBS ↔ stream, observer PC over LAN, and a match start to finish across Esportra, autopilot, OBS scene and on-screen graphic.', { tags: ['system', 'architecture'] }),
  S('sys-16-states', sys.states, 'System · States: OBS disconnected, feed stale, output dropped, node offline, rescheduled, forfeit, empty, loading.', { tags: ['system', 'states'], h: 790 }),
  S('sys-17-components-motion', sys.components, 'System · Components and motion: Take/Hold/primary/secondary states, tally and chips, monitors, hold countdown frames, take wipe, easing.', { tags: ['system', 'motion'], h: 740 }),
  S('sys-18-phone-remote', sys.phone, 'System · Phone remote: now/next with hold, triggers, alerts.', { tags: ['system', 'mobile'], h: 920 }),
  S('sys-19-onboarding', sys.onboarding, 'System · Onboarding: nine-step setup from tournament link to crew invite.', { tags: ['system', 'web'] }),
];
