import React from 'react';
import { Link } from 'react-router-dom';
import type { CompetitiveProfile, ExperienceLevel, PreferredEnvironment } from '@/types/competitive';
import type { LinkedAccountsDto } from '@/types/profile';
import { useCatalogGameRoles } from '@/hooks/competitive/useCatalog';

/**
 * CompetitiveTabContent — filled state for Surface 4 (PROJ-075).
 * Renders rank hero, roles, availability, languages, notes, linked accounts.
 * Only called when profile is non-null; shell handles loading/empty states.
 */

interface Props {
  profile: CompetitiveProfile;
  isOwnProfile: boolean;
  linkedAccounts: LinkedAccountsDto | null;
}

const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  casual: 'Casual',
  amateur: 'Amateur',
  semi_pro: 'Semi-pro',
  pro: 'Professional',
};

const ENVIRONMENT_LABELS: Record<PreferredEnvironment, string> = {
  casual: 'Casual teams',
  competitive: 'Competitive teams',
  pro: 'Pro environment',
};

const CAPTION = 'text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2';

export function CompetitiveTabContent({ profile, isOwnProfile, linkedAccounts }: Props): React.JSX.Element {
  const { data: roles } = useCatalogGameRoles('valorant');

  const riotName = linkedAccounts?.riot?.game_name ?? null;
  const riotTag = linkedAccounts?.riot?.tag_line ?? null;
  const showLinkedAccounts = (profile.riotIdVisible && riotName !== null) || isOwnProfile;

  return (
    <>
      {/* Rank hero section */}
      <section className="mb-6" aria-label="Rank">
        {profile.rankIconUrl ? (
          <img
            src={profile.rankIconUrl}
            alt={profile.rankDisplayName ?? 'Rank'}
            width={96}
            height={96}
            className="mb-3 md:mx-0 mx-auto"
          />
        ) : (
          <div
            className="h-24 w-24 bg-white/[0.06] flex items-center justify-center text-[14px] text-white/35 font-mono mb-3 md:mx-0 mx-auto"
            aria-hidden
          >
            {(profile.rankDisplayName ?? profile.rankTierKey ?? 'RK').slice(0, 2).toUpperCase()}
          </div>
        )}
        <p className="text-[24px] font-black text-white leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
          {profile.rankDisplayName ?? profile.rankTierKey ?? 'Unknown rank'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] px-2 py-0.5 bg-zinc-800 text-white/50 border border-white/[0.06]">
            Self-reported
          </span>
          {profile.regionDisplayName && (
            <span className="text-[12px] text-white/35">{profile.regionDisplayName}</span>
          )}
        </div>
      </section>

      {/* Roles section */}
      <section className="mb-6" aria-label="Roles">
        <p className={CAPTION}>ROLES</p>
        {profile.preferredRoles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.preferredRoles.map((roleKey) => {
              const roleData = roles?.find((r) => r.roleKey === roleKey);
              const isMain = roleKey === profile.mainRole;
              return (
                <div key={roleKey} className="inline-flex items-center gap-1.5 px-3 py-2 border border-white/[0.08] text-[13px] text-white/70">
                  {roleData?.iconUrl ? <img src={roleData.iconUrl} alt={roleData.displayName} width={20} height={20} /> : null}
                  <span>{roleData?.displayName ?? roleKey}</span>
                  {isMain && (
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-amber-500/15 text-amber-400 ml-2">MAIN</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[13px] text-white/35">No roles set</p>
        )}
      </section>

      {/* Availability section */}
      <section className="mb-6" aria-label="Availability">
        <p className={CAPTION}>AVAILABILITY</p>
        <div className={profile.lookingForTeam
          ? 'inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-400/20 bg-emerald-500/[0.08] text-[12px] text-emerald-300'
          : 'inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/[0.06] bg-white/[0.03] text-[12px] text-white/35'}
        >
          {profile.lookingForTeam ? 'Looking for team' : 'Not looking'}
        </div>
        {profile.competitiveExperience && (
          <p className="text-[13px] text-white/55 mt-2">{EXPERIENCE_LABELS[profile.competitiveExperience]}</p>
        )}
        {profile.preferredTeamEnvironment && (
          <p className="text-[12px] text-white/40 mt-1">{ENVIRONMENT_LABELS[profile.preferredTeamEnvironment]}</p>
        )}
      </section>

      {/* Languages section */}
      {profile.languages.length > 0 && (
        <section className="mb-6" aria-label="Languages">
          <p className={CAPTION}>LANGUAGES</p>
          <div className="flex flex-wrap gap-2">
            {profile.languages.map((lang) => (
              <span key={lang} className="inline-flex px-3 py-1.5 border border-white/[0.08] text-[12px] text-white/60">{lang}</span>
            ))}
          </div>
        </section>
      )}

      {/* Notes section */}
      {profile.notes && (
        <section className="mb-6" aria-label="Notes">
          <p className={CAPTION}>NOTES</p>
          <p className="text-[14px] text-white/70 leading-relaxed">{profile.notes}</p>
        </section>
      )}

      {/* Linked accounts section */}
      {showLinkedAccounts && (
        <section aria-label="Linked accounts">
          <p className={CAPTION}>LINKED ACCOUNTS</p>
          <div className="flex items-center gap-2">
            <img src="/games/riot-logo.png" alt="Riot Games" className="h-4 w-4 object-contain" />
            {riotName ? (
              <span className="text-[13px] font-mono text-white/70">{riotName} #{riotTag ?? ''}</span>
            ) : (
              <span className="text-[13px] text-white/35">
                No Riot account linked.{' '}
                <Link to="/settings/accounts" className="text-white/55 hover:text-white transition-colors">Link account →</Link>
              </span>
            )}
          </div>
        </section>
      )}
    </>
  );
}
