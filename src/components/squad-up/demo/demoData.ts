import { resolveAgent } from '@/lib/valorantAgents';
import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import type { PopularAgent } from '@/types/competitive';
import type { SlatePlayer } from '../shared/slate';

/** Sample players for the public demo. Fictional people; agent and card art are the game's own. */
type AgentStat = [id: string, games: number, wins: number, kd: number];
const agents = (...stats: AgentStat[]): PopularAgent[] =>
  stats.map(([id, games, wins, kd]) => ({
    agentId: id, displayName: resolveAgent(id)?.displayName ?? 'Agent', iconUrl: resolveAgent(id)?.iconUrl ?? '', gamesPlayed: games, wins, kdRatio: kd,
  }));

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

/** Riot player cards (valorant-api.com); their wide art becomes the card banner, as for real players. */
const CARD = {
  omen: '504f38e4-4874-845c-ccb6-a3aec7a3a1eb', skye: '1f28ac65-411d-619a-ed18-5cafda3acba7', killjoy: 'e9021053-495a-e500-9f57-b59f2f94d01b',
  jett: 'ab5a453a-f726-4e04-b277-f30d56a8b152', sage: '910ace70-4d3b-3c53-2c55-5f9fa179caa8', sova: 'b03e3577-4f31-ae08-b9b7-4eb587fd13c3',
  viper: '2f7fd4ed-4b6b-b3fc-0658-18a58f61581b', reyna: 'e9dcc215-4b83-90e4-ba3b-4f8d32568eb6',
};

const avatar = (seed: string) => resolveLfgAvatar(null, seed, 'critters');
const person = (id: string, name: string, tag: string, country: string, area: string) =>
  ({ id, name, riotGameName: name, riotTagLine: tag, avatarUrl: avatar(`${id}-demo`), avatarSeed: `${id}-demo`, avatarStyle: 'critters', countryCode: country, area });

export const DEMO_PLAYERS: SlatePlayer[] = [
  { ...person('d1', 'Haris', 'KHI', 'PK', 'south-asia'), playerCardId: CARD.omen, mode: 'competitive', tier: 15, tierName: 'Platinum 1',
    winRate: 54, kd: 1.12, hs: 23, agents: agents([OMEN, 41, 23, 1.14], [CLOVE, 18, 10, 1.05], [VIPER, 9, 4, 0.97]), roles: ['Controller'],
    mic: true, needs: 2, synergy: 'great_synergy', note: 'I smoke, you entry. Evenings, PKT.' },
  { ...person('d2', 'Noor', 'DXB', 'AE', 'middle-east'), playerCardId: CARD.skye, mode: 'competitive', tier: 16, tierName: 'Platinum 2',
    winRate: 58, kd: 1.31, hs: 27, agents: agents([SKYE, 52, 31, 1.29], [FADE, 20, 12, 1.33], [SOVA, 7, 4, 1.1]), roles: ['Initiator'],
    mic: true, needs: 1, likedYou: true, synergy: 'great_synergy', note: 'Flashes on call. Calm comms only.' },
  { ...person('d3', 'Zayn', 'LHR', 'PK', 'south-asia'), playerCardId: CARD.killjoy, mode: 'competitive', tier: 14, tierName: 'Gold 3',
    winRate: 49, kd: 0.98, hs: 19, agents: agents([KILLJOY, 37, 18, 0.99], [CYPHER, 22, 11, 0.95]), roles: ['Sentinel'],
    mic: false, needs: 3, synergy: 'role_overlap', note: 'Text comms, but I hold my site.' },
  { ...person('d4', 'Rami', 'RUH', 'SA', 'middle-east'), playerCardId: CARD.jett, mode: 'competitive', tier: 17, tierName: 'Platinum 3',
    winRate: 61, kd: 1.44, hs: 31, agents: agents([JETT, 60, 38, 1.52], [RAZE, 24, 14, 1.36], [REYNA, 11, 6, 1.41]), roles: ['Duelist'],
    mic: true, needs: 2, synergy: 'great_synergy', note: 'Entry fragger. Climbing to Diamond tonight.' },
  { ...person('d5', 'Mehak', 'ISB', 'PK', 'south-asia'), playerCardId: CARD.sage, mode: 'competitive', tier: 15, tierName: 'Platinum 1',
    winRate: 52, kd: 1.05, hs: 21, agents: agents([SAGE, 44, 23, 1.02], [KILLJOY, 15, 8, 1.08]), roles: ['Sentinel'],
    mic: true, needs: 1, synergy: 'great_synergy', note: 'Will res you. Probably.' },
  { ...person('d6', 'Faisal', 'DOH', 'QA', 'middle-east'), playerCardId: CARD.sova, mode: 'competitive', tier: 13, tierName: 'Gold 2',
    winRate: 47, kd: 0.91, hs: 18, agents: agents([SOVA, 33, 15, 0.9], [FADE, 12, 6, 0.94]), roles: ['Initiator'],
    mic: true, needs: 3, synergy: 'unknown', note: null },
  { ...person('d7', 'Ali', 'BAH', 'BH', 'middle-east'), playerCardId: CARD.viper, mode: 'competitive', tier: 16, tierName: 'Platinum 2',
    winRate: 56, kd: 1.22, hs: 25, agents: agents([VIPER, 48, 27, 1.24], [OMEN, 19, 10, 1.15]), roles: ['Controller'],
    mic: true, needs: 2, synergy: 'role_overlap', note: 'Post-plant lineups, no rage.' },
  { ...person('d8', 'Sana', 'KWT', 'KW', 'middle-east'), playerCardId: CARD.reyna, mode: 'competitive', tier: 18, tierName: 'Diamond 1',
    winRate: 63, kd: 1.38, hs: 29, agents: agents([REYNA, 57, 36, 1.47], [JETT, 26, 16, 1.3]), roles: ['Duelist'],
    mic: true, needs: 1, likedYou: true, synergy: 'great_synergy', note: 'Need one more for a 5-stack. Mic a must.' },
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
  area: 'south-asia',
};
