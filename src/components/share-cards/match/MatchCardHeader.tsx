import type { ShareTeam } from '@/services/matchStats/shareCardModel';
import { Caption, Crest, Cue } from '../shareCardParts';
import { DISPLAY, MUTED, rgba } from '../shareCardTheme';

const NOTCH = 28;
const PLATE_H = 148;

/** Cut corners on the outer edge only, so the plates point at the score. */
const cut = (side: 'left' | 'right') => (side === 'left'
    ? `polygon(${NOTCH}px 0, 100% 0, 100% 100%, 0 100%, 0 ${NOTCH}px)`
    : `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% ${NOTCH}px, 100% 100%, 0 100%)`);

function TeamPlate({ team, color, side }: { team: ShareTeam; color: string; side: 'left' | 'right' }) {
    const toCentre = side === 'left' ? '90deg' : '270deg';
    return (
        <div
            style={{
                position: 'relative', flex: 1, minWidth: 0, height: PLATE_H, clipPath: cut(side),
                background: `linear-gradient(${toCentre}, ${rgba(color, team.won ? 0.62 : 0.34)} 0%, ${rgba(color, 0.12)} 62%, rgba(9,9,11,0.55) 100%)`,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                display: 'flex', alignItems: 'center', gap: 28, padding: '0 40px',
                flexDirection: side === 'left' ? 'row' : 'row-reverse',
            }}
        >
            <Crest name={team.name} logo={team.logo} size={92} />
            <div style={{ minWidth: 0, textAlign: side }}>
                <div style={{ ...DISPLAY, fontWeight: 800, fontSize: team.name.length > 14 ? 40 : 54, lineHeight: 1.02, color: '#FAFAFA', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {team.name}
                </div>
                <div style={{ marginTop: 10 }}>
                    <Caption size={15} color={team.won ? '#FAFAFA' : 'rgba(250,250,250,0.6)'} spacing="0.32em">{team.won ? 'Victory' : 'Defeat'}</Caption>
                </div>
            </div>
        </div>
    );
}

/** Team plates either side of a notched score plate. */
export function MatchCardHeader({ teams, colors, mapName }: { teams: [ShareTeam, ShareTeam]; colors: [string, string]; mapName: string }) {
    const [a, b] = teams;
    const score = (team: ShareTeam, color: string) => (
        <div style={{ position: 'relative', textAlign: 'center', width: 150 }}>
            <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 104, fontVariantNumeric: 'tabular-nums', color: team.won ? '#FAFAFA' : '#52525B' }}>{team.score}</span>
            {team.won ? <div style={{ margin: '10px auto 0', width: 64, height: 4, background: color }} /> : <div style={{ height: 14 }} />}
        </div>
    );

    return (
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 18 }}>
            <TeamPlate team={a} color={colors[0]} side="left" />
            <div
                style={{
                    width: 440, height: PLATE_H + 44, marginTop: -22, flexShrink: 0, position: 'relative',
                    background: 'linear-gradient(180deg, rgba(24,24,27,0.96), rgba(9,9,11,0.96))',
                    clipPath: `polygon(${NOTCH}px 0, calc(100% - ${NOTCH}px) 0, 100% ${NOTCH}px, 100% 100%, 0 100%, 0 ${NOTCH}px)`,
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 20,
                }}
            >
                <Caption size={14} color={MUTED} spacing="0.34em">{mapName} · Full time</Caption>
                <Cue width={40} style={{ marginTop: 10 }} />
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                    {score(a, colors[0])}
                    <span style={{ ...DISPLAY, fontWeight: 800, fontSize: 64, color: '#3F3F46', marginTop: 18 }}>:</span>
                    {score(b, colors[1])}
                </div>
            </div>
            <TeamPlate team={b} color={colors[1]} side="right" />
        </div>
    );
}
