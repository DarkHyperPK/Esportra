import { Link } from 'react-router-dom';
import { RankBadge } from './RankBadge';
import { RoleChip } from './RoleChip';
import { RegionLabel } from './RegionLabel';
import { LftBadge } from './LftBadge';
import type { PlayerSearchResult } from '@/types/competitive';

interface PlayerDiscoveryCardProps {
  player: PlayerSearchResult;
}

function Avatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden
        className="h-10 w-10 shrink-0 object-cover bg-white/[0.07]"
      />
    );
  }
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center bg-white/[0.07] font-rajdhani text-base font-semibold text-white"
      aria-hidden
    >
      {username.substring(0, 2).toUpperCase()}
    </span>
  );
}

/**
 * Discovery card for a player in the Find Players tab.
 * Card hover: border + background swap only — no lift, no shadow.
 */
export function PlayerDiscoveryCard({ player }: PlayerDiscoveryCardProps) {
  const showLft = player.lftStatus === 'open';
  const displayRoles = player.roles.slice(0, 5);
  const extraRoles = player.roles.length > 5 ? player.roles.length - 5 : 0;

  return (
    <article
      aria-label={`${player.username}, ${player.rankTierDisplayName ?? 'unranked'}, ${player.roles.join(', ')}`}
      className="border border-white/[0.08] bg-white/[0.04] p-4 transition-colors duration-[120ms] hover:border-white/20 hover:bg-white/[0.07] cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <Avatar username={player.username} avatarUrl={player.avatarUrl} />

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Username */}
          <p className="text-[14px] font-medium text-white truncate">{player.username}</p>

          {/* Riot ID */}
          {player.riotIdVisible && player.riotId && (
            <p className="text-[12px] text-white/55 truncate">{player.riotId}</p>
          )}

          {/* Rank badge inline */}
          {player.rankTierDisplayName && (
            <RankBadge
              tierDisplayName={player.rankTierDisplayName}
              provenance={player.rankProvenance}
              size="inline"
            />
          )}

          {/* Role chips */}
          {displayRoles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayRoles.map((role) => (
                <RoleChip
                  key={role}
                  role={role}
                  displayName={role.toUpperCase()}
                  mode="display"
                  isMain={role === player.mainRole}
                />
              ))}
              {extraRoles > 0 && (
                <span className="text-[11px] text-white/35">+{extraRoles} more</span>
              )}
            </div>
          )}

          {/* Region */}
          <RegionLabel
            region={player.regionDisplayName}
            server={player.servers?.[0] ?? null}
          />
        </div>

        {/* LFT badge */}
        {showLft && (
          <div className="shrink-0">
            <LftBadge />
          </div>
        )}
      </div>

      {/* View profile link */}
      <div className="mt-3 flex justify-end">
        <Link
          to={`/profile/${player.username}`}
          className="text-[13px] text-white/55 hover:text-white transition-colors duration-[120ms]"
        >
          View profile →
        </Link>
      </div>
    </article>
  );
}
