import type { ValorantAgent } from '@/hooks/useValorantCatalog';
import type { SharePlayer, ShareTeam } from '@/services/matchStats/shareCardModel';
import { Caption } from '../shareCardParts';
import { BODY, DISPLAY, MUTED, rgba } from '../shareCardTheme';

type Align = 'left' | 'right';

const ROW_H = 68;
const CUT = 18;
/** Icon, who, then the numbers; the right board mirrors it so both read from the centre out. */
const COLUMNS = ['68px', 'minmax(0,1fr)', '132px', '72px', '72px', '72px', '48px'];
const LABELS = ['', '', 'K / D / A', 'ACS', 'ADR', 'HS%', 'FK'];

const cut = (align: Align) => (align === 'left'
    ? `polygon(${CUT}px 0, 100% 0, 100% 100%, 0 100%, 0 ${CUT}px)`
    : `polygon(0 0, calc(100% - ${CUT}px) 0, 100% ${CUT}px, 100% 100%, 0 100%)`);

const ordered = <T,>(items: T[], align: Align) => (align === 'left' ? items : [...items].reverse());

function Row({ player, agent, color, align, lead, dim }: { player: SharePlayer; agent?: ValorantAgent; color: string; align: Align; lead: boolean; dim: boolean }) {
    const fade = align === 'left' ? '90deg' : '270deg';
    const num = (value: string | number | null, key: string) => (
        <span key={key} style={{ ...DISPLAY, fontWeight: 800, fontSize: 26, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: dim ? '#D4D4D8' : '#FAFAFA' }}>{value ?? '–'}</span>
    );
    const cells = [
        <div key="icon" style={{ height: ROW_H, background: rgba(color, lead ? 0.7 : 0.42), overflow: 'hidden' }}>
            {agent?.displayIcon ? <img src={agent.displayIcon} crossOrigin="anonymous" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: align === 'right' ? 'scaleX(-1)' : undefined }} /> : null}
        </div>,
        <div key="who" style={{ minWidth: 0, padding: '0 18px', textAlign: align }}>
            <Caption size={11} color={lead ? '#FAFAFA' : 'rgba(250,250,250,0.62)'} spacing="0.2em">{[agent?.displayName, agent?.role].filter(Boolean).join(' · ') || 'Agent'}</Caption>
            <div style={{ ...DISPLAY, marginTop: 6, fontWeight: 800, fontSize: 25, color: '#FAFAFA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
        </div>,
        num(`${player.kills}/${player.deaths}/${player.assists}`, 'kda'),
        num(player.acs, 'acs'),
        num(player.adr, 'adr'),
        num(player.hsPct === null ? null : `${player.hsPct}%`, 'hs'),
        num(player.firstKills, 'fk'),
    ];
    return (
        <div
            style={{
                position: 'relative', display: 'grid', alignItems: 'center', height: ROW_H, clipPath: cut(align),
                gridTemplateColumns: ordered(COLUMNS, align).join(' '),
                background: `linear-gradient(${fade}, ${rgba(color, lead ? 0.5 : 0.3)} 0%, rgba(17,17,20,0.9) 46%, rgba(17,17,20,0.94) 100%)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
        >
            {ordered(cells, align)}
            {lead ? <div style={{ position: 'absolute', top: 0, bottom: 0, [align === 'left' ? 'right' : 'left']: 0, width: 3, background: '#FAFAFA' }} /> : null}
        </div>
    );
}

/** One team's five players, best first, in the team's colour. */
export function MatchCardBoard({ team, agents, color, align }: { team: ShareTeam; agents: Record<string, ValorantAgent>; color: string; align: Align }) {
    return (
        <div style={{ ...BODY, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: ordered(COLUMNS, align).join(' '), padding: '0 0 10px', alignItems: 'end' }}>
                {ordered(LABELS.map((label, i) => (
                    <Caption key={i} size={11} color={MUTED} spacing="0.22em" style={{ textAlign: i === 1 ? align : 'center', padding: i === 1 ? '0 18px' : undefined }}>
                        {i === 1 ? team.name : label}
                    </Caption>
                )), align)}
            </div>
            <div style={{ display: 'grid', gap: 5 }}>
                {team.players.map((player, index) => (
                    <Row key={player.puuid} player={player} agent={agents[player.agentId]} color={color} align={align} lead={index === 0} dim={!team.won} />
                ))}
            </div>
        </div>
    );
}
