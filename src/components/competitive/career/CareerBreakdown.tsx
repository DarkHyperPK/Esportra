import type { ReactNode } from 'react';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { resolveAgent } from '@/lib/valorantAgents';
import { formatNumber, formatPct, gameDate } from '@/services/career/format';
import type { AgentLine, MapLine, TeamLine } from '@/types/career';

function Section({ title, empty, children }: { title: string; empty: string; children: ReactNode[] }) {
  return (
    <section aria-label={title} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <h3 className={EYEBROW_CLASS}>{title}</h3>
      {children.length === 0 ? <p className="mt-3 text-[13px] text-zinc-500">{empty}</p> : <ul className="mt-3 divide-y divide-white/5">{children}</ul>}
    </section>
  );
}

function Row({ left, right, sub }: { left: ReactNode; right: string; sub?: string }) {
  return (
    <li className="py-2 text-[13px]">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-zinc-200">{left}</span>
        <span className="shrink-0 tabular-nums text-zinc-400">{right}</span>
      </div>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>}
    </li>
  );
}

export function AgentBreakdown({ agents }: { agents: AgentLine[] }) {
  return (
    <Section title="Agents played" empty="No agent data yet.">
      {agents.slice(0, 8).map((a) => {
        const known = resolveAgent(a.characterId);
        return (
          <Row key={a.characterId}
            left={<>{known && <img src={known.iconUrl} alt="" className="h-6 w-6 shrink-0 rounded-sm" loading="lazy" />}<span className="truncate">{known?.displayName ?? 'Unknown agent'}</span></>}
            right={`${a.matches} · ${formatPct(a.winRatePct)} · K/D ${formatNumber(a.kd)} · ACS ${formatNumber(a.acs, 0)}`} />
        );
      })}
    </Section>
  );
}

export function MapBreakdown({ maps }: { maps: MapLine[] }) {
  return (
    <Section title="Maps played" empty="No map data yet.">
      {maps.slice(0, 8).map((m) => (
        <Row key={m.mapId} left={<span className="truncate">{m.map}</span>} right={`${m.matches} · ${formatPct(m.winRatePct)}`} />
      ))}
    </Section>
  );
}

export function TeamBreakdown({ teams }: { teams: TeamLine[] }) {
  return (
    <Section title="Teams played for" empty="No team data yet.">
      {teams.map((t, i) => (
        <Row key={t.teamId ?? `solo-${i}`}
          left={<span className="truncate">{t.teamName ?? 'Solo entry'}</span>}
          right={`${t.matches} ${t.matches === 1 ? 'game' : 'games'} · ${t.wins} won`}
          sub={`${gameDate(t.firstPlayed)} – ${gameDate(t.lastPlayed)}`} />
      ))}
    </Section>
  );
}
