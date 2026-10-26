/**
 * PlayerDiscoveryCard — PROJ-075 rebuild.
 * Uses canonical PlayerSearchResult fields: avatarSeed, rankDisplayName, rankIconUrl,
 * preferredRoles, mainRole, regionDisplayName, lookingForTeam.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlayerSearchResult, CatalogGameRole } from '@/types/competitive';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SeedAvatar({ seed, username }: { seed: string | null; username: string | null }) {
  const initials = (seed ?? username ?? '??').slice(0, 2).toUpperCase();
  return (
    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center bg-white/[0.07] font-mono text-[12px] font-semibold text-white/70">
      {initials}
    </span>
  );
}

function RankImg({ iconUrl, displayName }: { iconUrl: string | null; displayName: string | null }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return <img src={iconUrl} alt={displayName ?? 'Rank'} className="h-12 w-12 shrink-0 object-contain" onError={() => setFailed(true)} />;
  }
  return (
    <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-white/[0.06] font-mono text-[11px] text-white/35">
      {(displayName ?? '?').slice(0, 2)}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlayerDiscoveryCardProps {
  player: PlayerSearchResult;
  gameRoles?: CatalogGameRole[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlayerDiscoveryCard({ player, gameRoles = [] }: PlayerDiscoveryCardProps) {
  const displayName = player.username ?? 'Unknown';
  const mainRoleData = player.mainRole ? gameRoles.find(r => r.roleKey === player.mainRole) : null;
  const otherRoles = (player.preferredRoles ?? []).filter(rk => rk !== player.mainRole).slice(0, 2);

  const ariaLabel = [
    displayName,
    player.rankDisplayName ?? 'unranked',
    player.mainRole ? `Main: ${player.mainRole}` : '',
    player.regionDisplayName ?? '',
  ].filter(Boolean).join(', ');

  return (
    <article
      aria-label={ariaLabel}
      className="border border-white/[0.06] bg-white/[0.03] p-4 transition-colors duration-[150ms] hover:border-white/20 hover:bg-white/[0.05]"
    >
      {/* Row 1: identity */}
      <div className="flex items-center gap-2 mb-2">
        <SeedAvatar seed={player.avatarSeed} username={player.username} />
        <span className="flex-1 min-w-0 text-[14px] font-medium text-white truncate">{displayName}</span>
        {player.lookingForTeam && (
          <span className="shrink-0 text-[11px] px-2 py-0.5 border border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-300/80">
            Looking for team
          </span>
        )}
      </div>

      {/* Row 2: rank */}
      {(player.rankDisplayName || player.rankIconUrl) && (
        <div className="flex items-center gap-3 mb-2">
          <RankImg iconUrl={player.rankIconUrl} displayName={player.rankDisplayName} />
          <span className="text-[16px] font-semibold text-white [font-family:var(--font-heading)]">
            {player.rankDisplayName ?? 'Unranked'}
          </span>
        </div>
      )}

      {/* Row 3: roles */}
      {(player.preferredRoles ?? []).length > 0 && (
        <div className="mb-2">
          {player.mainRole && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[12px] text-white/35">Main:</span>
              {mainRoleData?.iconUrl && (
                <img src={mainRoleData.iconUrl} alt={mainRoleData.displayName} width={16} height={16} className="shrink-0" />
              )}
              <span className="text-[12px] text-white">{mainRoleData?.displayName ?? player.mainRole}</span>
            </div>
          )}
          {otherRoles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-white/35">Also:</span>
              {otherRoles.map(rk => {
                const r = gameRoles.find(gr => gr.roleKey === rk);
                return r?.iconUrl
                  ? <img key={rk} src={r.iconUrl} alt={r.displayName} title={r.displayName} width={16} height={16} className="shrink-0" />
                  : <span key={rk} className="text-[12px] text-white/55">{r?.displayName ?? rk}</span>;
              })}
            </div>
          )}
        </div>
      )}

      {/* Row 4: context */}
      {(player.regionDisplayName || player.languages?.[0]) && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-3 text-[12px] text-white/40">
          {player.regionDisplayName && <span>{player.regionDisplayName}</span>}
          {player.languages?.[0] && <span className="before:content-['·'] before:mr-1 before:text-white/20">{player.languages[0]}</span>}
        </div>
      )}

      {/* Row 5: action */}
      <div className="flex justify-end">
        <Link
          to={`/profile/${player.username ?? ''}`}
          className="text-[13px] text-white/55 hover:text-white transition-colors duration-[150ms]"
        >
          View Profile →
        </Link>
      </div>
    </article>
  );
}
