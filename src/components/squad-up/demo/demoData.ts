import { resolveAgent } from '@/lib/valorantAgents';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import type { SlatePlayer } from '../shared/slate';

/** Sample players for the public demo. Fictional people; agent art is the game's own. */
const agents = (...ids: string[]) =>
  ids.map((id) => ({ id, name: resolveAgent(id)?.displayName ?? 'Agent', iconUrl: resolveAgent(id)?.iconUrl ?? null }));

const OMEN = '8e253930-4c05-31dd-1b6c-968525494517';
const JETT = 'add6443a-41bd-e414-f6ad-e58d267f4e95';
const SOVA = '320b2a48-4d9b-a075-30f1-1f93a9b638fa';
const KILLJOY = '1e58de9c-4950-5125-93e9-a0aee9f98746';
const SAGE = '569fdd95-4d10-43ab-ca70-79becc718b46';
const RAZE = 'f94c3b30-42be-e959-889c-5aa313dba261';
const FADE = 'dade69b4-4f5a-8528-247b-219e5a1facd6';
const CLOVE = '1dbf2edd-4729-0984-3115-daa5eed44993';
const CYPHER = '117ed9e3-49f3-6512-3ccf-0cada7e3823b';
const REYNA = 'a3bfb853-43b2-7238-a4f1-ad90e9e46bcc';
const SKYE = '6f2a04ca-43e0-be17-7f36-b3908627744d';
const VIPER = '707eab51-4836-f488-046a-cda6bf494859';

const avatar = (seed: string) => resolveLfgAvatar(null, seed, 'critters');

export const DEMO_PLAYERS: SlatePlayer[] = [
  { id: 'd1', name: 'Haris', riotId: 'Haris#KHI', avatarUrl: avatar('haris-demo'), countryCode: 'PK', mode: 'competitive', tier: 15, tierName: 'Platinum 1',
    winRate: 54, kd: 1.12, hs: 23, agents: agents(OMEN, CLOVE, VIPER), roles: ['Controller'], mic: true, needs: 2, synergy: 'great_synergy',
    note: 'I smoke, you entry. Evenings, PKT.' },
  { id: 'd2', name: 'Noor', riotId: 'NoorFlash#DXB', avatarUrl: avatar('noor-demo'), countryCode: 'AE', mode: 'competitive', tier: 16, tierName: 'Platinum 2',
    winRate: 58, kd: 1.31, hs: 27, agents: agents(SKYE, FADE, SOVA), roles: ['Initiator'], mic: true, needs: 1, likedYou: true, synergy: 'great_synergy',
    note: 'Flashes on call. Calm comms only.' },
  { id: 'd3', name: 'Zayn', riotId: 'zayn#LHR', avatarUrl: avatar('zayn-demo'), countryCode: 'PK', mode: 'competitive', tier: 14, tierName: 'Gold 3',
    winRate: 49, kd: 0.98, hs: 19, agents: agents(KILLJOY, CYPHER), roles: ['Sentinel'], mic: false, needs: 3, synergy: 'role_overlap',
    note: 'Text comms, but I hold my site.' },
  { id: 'd4', name: 'Rami', riotId: 'Rami#RUH', avatarUrl: avatar('rami-demo'), countryCode: 'SA', mode: 'competitive', tier: 17, tierName: 'Platinum 3',
    winRate: 61, kd: 1.44, hs: 31, agents: agents(JETT, RAZE, REYNA), roles: ['Duelist'], mic: true, needs: 2, synergy: 'great_synergy',
    note: 'Entry fragger. Looking to climb to Diamond tonight.' },
  { id: 'd5', name: 'Mehak', riotId: 'mehak#ISB', avatarUrl: avatar('mehak-demo'), countryCode: 'PK', mode: 'competitive', tier: 15, tierName: 'Platinum 1',
    winRate: 52, kd: 1.05, hs: 21, agents: agents(SAGE, KILLJOY), roles: ['Sentinel'], mic: true, needs: 1, synergy: 'great_synergy',
    note: 'Will res you. Probably.' },
  { id: 'd6', name: 'Faisal', riotId: 'Faisal#DOH', avatarUrl: avatar('faisal-demo'), countryCode: 'QA', mode: 'competitive', tier: 13, tierName: 'Gold 2',
    winRate: 47, kd: 0.91, hs: 18, agents: agents(SOVA, FADE), roles: ['Initiator'], mic: true, needs: 3, synergy: 'unknown', note: null },
  { id: 'd7', name: 'Ali', riotId: 'ali#BAH', avatarUrl: avatar('ali-demo'), countryCode: 'BH', mode: 'competitive', tier: 16, tierName: 'Platinum 2',
    winRate: 56, kd: 1.22, hs: 25, agents: agents(VIPER, OMEN), roles: ['Controller'], mic: true, needs: 2, synergy: 'role_overlap',
    note: 'Post-plant lineups, no rage.' },
  { id: 'd8', name: 'Sana', riotId: 'Sana#KWT', avatarUrl: avatar('sana-demo'), countryCode: 'KW', mode: 'competitive', tier: 18, tierName: 'Diamond 1',
    winRate: 63, kd: 1.38, hs: 29, agents: agents(REYNA, JETT), roles: ['Duelist'], mic: true, needs: 1, likedYou: true, synergy: 'great_synergy',
    note: 'Need one more for a 5-stack. Mic a must.' },
];

/** The sample lobby in the Lobby tab: host plus two players, two open slots. */
export const DEMO_LOBBY = {
  title: 'Ranked tonight, need smokes',
  host: { name: 'Bilal', avatarUrl: avatar('bilal-demo'), role: 'Duelist' },
  members: [
    { name: 'Ayesha', avatarUrl: avatar('ayesha-demo'), role: 'Initiator' },
    { name: 'Omar', avatarUrl: avatar('omar-demo'), role: 'Sentinel' },
  ],
  wanted: ['Controller', 'Sentinel'],
  /** Joins right after the visitor, so they see the lobby fill. */
  lastToJoin: { name: 'Hamza', avatarUrl: avatar('hamza-demo'), role: 'Sentinel' },
  rank: 'Gold 3 – Platinum 3',
  countries: ['PK', 'AE'],
};
