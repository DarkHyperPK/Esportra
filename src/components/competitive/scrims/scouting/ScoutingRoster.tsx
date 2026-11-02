/**
 * ScoutingRoster
 *
 * Who you would be playing: each player's rank and headline stats.
 */

import { SCRIM_LABEL } from '../scrimCardStyles';
import { useState } from 'react';

import { resolveLfgAvatar } from '@/lib/lfgAvatar';
import type { ScrimTeamMemberDetail } from '@/types/competitive';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-10 text-center">
      <p className="text-[11px] font-medium text-zinc-600">{label}</p>
      <p className="text-[12px] font-semibold tabular-nums text-white/80">{value}</p>
    </div>
  );
}

function MemberRow({ member }: { member: ScrimTeamMemberDetail }) {
  const [failed, setFailed] = useState(false);
  const src = resolveLfgAvatar(null, member.avatarSeed, member.avatarStyle);
  const name = member.username ?? 'Player';

  return (
    <li className="flex items-center gap-3 px-3.5 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 font-mono text-[11px] font-semibold text-white/60">
        {src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-white">{name}</span>
          {member.role === 'captain' && <span className="text-[11px] font-medium text-white/60">Captain</span>}
          {member.role === 'manager' && <span className="text-[11px] font-medium text-zinc-500">Manager</span>}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
          {member.rankIconUrl && <img src={member.rankIconUrl} alt="" className="h-4 w-4 object-contain" />}
          {member.rankDisplayName ?? member.competitiveTierName ?? 'Unranked'}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Stat label="WR" value={member.winRate != null ? `${Math.round(Number(member.winRate))}%` : '—'} />
        <Stat label="K/D" value={member.kdRatio != null ? Number(member.kdRatio).toFixed(2) : '—'} />
        <Stat label="HS" value={member.hsPct != null ? `${Math.round(Number(member.hsPct))}%` : '—'} />
      </div>
    </li>
  );
}

export function ScoutingRoster({ members }: { members: ScrimTeamMemberDetail[] }) {
  return (
    <section className="space-y-2" aria-labelledby="scouting-roster-title">
      <h3 id="scouting-roster-title" className={SCRIM_LABEL}>
        Roster <span className="ml-1 tabular-nums text-white/60">{members.length}</span>
      </h3>
      {members.length === 0 ? (
        <p className="text-[13px] text-zinc-500">No roster listed.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          {members.map((m, i) => <MemberRow key={m.username ?? i} member={m} />)}
        </ul>
      )}
    </section>
  );
}
