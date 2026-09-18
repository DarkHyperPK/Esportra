import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { PublicProfileDto } from '@/types/profile';
import { useParallax } from '@/hooks/useParallax';
import { getCountryFlag } from '@/utils/countries';

interface ProfileHeroProps {
  profile: PublicProfileDto;
  accentColor: string;
}

/**
 * ProfileHero: banner + avatar + name + username + country.
 * Banner parallax via useParallax (disabled on reduced motion).
 * Avatar ring fires hero-ring-settle spring animation on mount (once).
 */
export function ProfileHero({ profile, accentColor }: ProfileHeroProps): React.JSX.Element {
  const reduced = useReducedMotion();
  // Banner parallax — coefficient 0.15, max 30px
  const bannerRef = useParallax(0.15, 30) as React.RefObject<HTMLDivElement>;
  const displayName = profile.full_name || profile.username;

  return (
    <div style={{ position: 'relative' }}>
      {/* Banner */}
      <div
        style={{
          position: 'relative',
          height: 200,
          overflow: 'hidden',
        }}
      >
        <div
          ref={bannerRef}
          style={{
            position: 'absolute',
            inset: '-30px 0 -30px 0',
          }}
        >
          {profile.banner_url ? (
            <img
              src={profile.banner_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1a1a24 0%, #0E0E12 100%)',
              }}
            />
          )}
        </div>
      </div>

      {/* Avatar — overlaps banner bottom by 40px */}
      <div
        style={{
          position: 'relative',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: 24,
          }}
        >
          <motion.div
            initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `3px solid ${accentColor}`,
              overflow: 'hidden',
              background: '#1a1a24',
              zIndex: 10,
              position: 'relative',
            }}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 48,
                  fontWeight: 700,
                  color: accentColor,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {(displayName[0] ?? '?').toUpperCase()}
              </div>
            )}
          </motion.div>
        </div>

        {/* Hero content — padding-top clears avatar overlap */}
        <div style={{ paddingTop: 88 }}>
          {/* Display name */}
          <h1
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              fontSize: 28,
              color: '#FFFFFF',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayName}
          </h1>
          {/* Username */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              fontSize: 15,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 4,
            }}
          >
            @{profile.username}
          </div>
          {/* Country + location */}
          {(profile.country_code || profile.location) && (
            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {profile.country_code && <span>{getCountryFlag(profile.country_code)}</span>}
              {profile.location && <span>{profile.location}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
