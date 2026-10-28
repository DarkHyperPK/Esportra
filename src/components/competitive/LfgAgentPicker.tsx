import { useState } from 'react';
import { useValorantAgents } from '@/hooks/useValorantCatalog';
import { VALORANT_AGENTS, parsePopularAgents } from '@/lib/valorantAgents';
import type { PopularAgent } from '@/types/competitive';

export function LfgAgentPicker({ value, onChange, stats, syncStatus }: { value: string[]; onChange: (ids: string[]) => void; stats?: PopularAgent[] | null; syncStatus?: string | null }) {
  const [search, setSearch] = useState('');
  const catalog = useValorantAgents();
  const played = parsePopularAgents(stats);
  const fallback = [...VALORANT_AGENTS].map(([uuid, agent]) => ({ uuid, displayName: agent.displayName, displayIcon: agent.iconUrl }));
  const agents = catalog.data && Object.keys(catalog.data).length ? Object.values(catalog.data) : fallback;
  const getStats = (id: string) => played.find(item => item.agentId.toLowerCase() === id.toLowerCase());
  const sorted = [...agents].filter(agent => (agent.displayName ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (getStats(b.uuid)?.gamesPlayed ?? 0) - (getStats(a.uuid)?.gamesPlayed ?? 0) || (a.displayName ?? '').localeCompare(b.displayName ?? ''));
  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter(item => item !== id));
    else if (value.length < 5) onChange([...value, id]);
  }
  return <div className="lfg-agent-picker"><div className="lfg-agent-picker-head"><span>Preferred agents</span><span>{value.length} / 5</span></div><p className="lfg-sub">Choose up to five. Your listing shows current-act competitive stats.</p>
    <input className="lfg-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search agents" aria-label="Search agents" />
    <div className="lfg-agent-options">{sorted.map(agent => { const selected = value.includes(agent.uuid); const record = getStats(agent.uuid); return <button type="button" key={agent.uuid} className="lfg-agent-option" aria-pressed={selected} disabled={!selected && value.length >= 5} onClick={() => toggle(agent.uuid)}>
      {agent.displayIcon && <img src={agent.displayIcon} alt="" loading="lazy" />}<strong>{agent.displayName}</strong><small>{record?.gamesPlayed ? `${record.gamesPlayed} games · ${Math.round(record.wins / record.gamesPlayed * 100)}% WR · ${record.kdRatio != null ? Number(record.kdRatio).toFixed(2) : '—'} K/D` : syncStatus === 'complete' ? 'No recorded matches' : syncStatus === 'pending' || syncStatus === 'syncing' ? 'Syncing stats…' : 'Stats unavailable'}</small>
    </button>; })}</div>{!sorted.length && <p className="lfg-sub">No agents match your search.</p>}
  </div>;
}
