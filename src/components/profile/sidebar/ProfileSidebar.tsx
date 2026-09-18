import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { PublicProfileDto, LinkedAccountsDto } from '@/types/profile';
import { LinkedAccountBadges } from './LinkedAccountBadges';
import { SocialLinks } from './SocialLinks';
import { format, parseISO } from 'date-fns';
import { getCountryFlag } from '@/utils/countries';

interface ProfileSidebarProps {
  profile: PublicProfileDto;
  linkedAccounts: LinkedAccountsDto | null;
}

interface MobileAccordionProps {
  label: string;
  children: React.ReactNode;
}

/**
 * MobileAccordion: a single collapsible section for the mobile sidebar.
 * Height animates with a spring (stiffness 200, damping 22) so it feels
 * snappy without being abrupt. ChevronDown rotates with the same spring.
 */
function MobileAccordion({ label, children }: MobileAccordionProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingTop: 6,
        marginTop: 4,
        width: '100%',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '4px 0',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.55)',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.04em',
        }}
      >
        <span>{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="accordion-content"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            style={{ overflow: 'hidden' }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
          >
            <div style={{ paddingTop: 8, paddingBottom: 6 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ProfileSidebar: sticky left rail on desktop, collapses to chip strip + accordions on mobile.
 * Desktop: shows bio, social links, linked accounts, member since, location, full_name inline.
 * Mobile: chips for location/member-since + collapsible About / Links / Accounts sections.
 */
export function ProfileSidebar({ profile, linkedAccounts }: ProfileSidebarProps): React.JSX.Element {
  const memberSince = (() => {
    try { return 'Member since ' + format(parseISO(profile.created_at), 'MMM yyyy'); }
    catch { return ''; }
  })();

  const hasSocials = !!(
    profile.social_links && (
      profile.social_links.twitter ||
      profile.social_links.twitch ||
      profile.social_links.youtube ||
      profile.social_links.instagram ||
      profile.social_links.discord_handle
    )
  );

  const hasLinkedAccounts = !!(
    linkedAccounts && (
      linkedAccounts.riot?.game_name ||
      linkedAccounts.steam?.steam_name
    )
  );

  return (
    <>
      <style>{`
        .profile-sidebar {
          color: rgba(255,255,255,0.7);
        }
        @media (min-width: 1024px) {
          .profile-sidebar {
            position: sticky;
            top: 24px;
            width: 240px;
            flex-shrink: 0;
          }
          .sidebar-chip-strip { display: none !important; }
        }
        @media (max-width: 1023px) {
          .sidebar-full-content { display: none !important; }
        }
      `}</style>

      {/* Desktop full sidebar */}
      <aside className="profile-sidebar">
        <div className="sidebar-full-content">
          {/* full_name */}
          {profile.full_name && (
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.6)',
                marginBottom: 12,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {profile.full_name}
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              {profile.bio}
            </div>
          )}

          {/* Location */}
          {profile.location && (
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {profile.country_code && <span>{getCountryFlag(profile.country_code)}</span>}
              <span>{profile.location}</span>
            </div>
          )}

          {/* Social links */}
          {profile.social_links && <SocialLinks socials={profile.social_links} />}

          {/* Linked accounts */}
          {linkedAccounts && (
            <LinkedAccountBadges linkedAccounts={linkedAccounts} />
          )}

          {/* Member since */}
          {memberSince && (
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: 12,
                color: 'rgba(255,255,255,0.35)',
                marginTop: 8,
              }}
            >
              {memberSince}
            </div>
          )}
        </div>

        {/* Mobile section — location/member-since chips + collapsible About/Links/Accounts */}
        <div
          className="sidebar-chip-strip"
          style={{ marginBottom: 16 }}
        >
          {/* Chip row */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: (profile.bio || hasSocials || hasLinkedAccounts) ? 4 : 0,
            }}
          >
            {profile.location && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {profile.country_code && <span>{getCountryFlag(profile.country_code)}</span>}
                {profile.location}
              </span>
            )}
            {memberSince && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                {memberSince}
              </span>
            )}
          </div>

          {/* About — bio */}
          {profile.bio && (
            <MobileAccordion label="About">
              <p
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.55,
                  margin: 0,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {profile.bio}
              </p>
            </MobileAccordion>
          )}

          {/* Links — social handles */}
          {hasSocials && profile.social_links && (
            <MobileAccordion label="Links">
              <SocialLinks socials={profile.social_links} />
            </MobileAccordion>
          )}

          {/* Accounts — Riot / Steam */}
          {hasLinkedAccounts && linkedAccounts && (
            <MobileAccordion label="Accounts">
              <LinkedAccountBadges linkedAccounts={linkedAccounts} />
            </MobileAccordion>
          )}
        </div>
      </aside>
    </>
  );
}
