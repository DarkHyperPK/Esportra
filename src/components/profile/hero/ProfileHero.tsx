import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { PublicProfileDto } from '@/types/profile';
import { useParallax } from '@/hooks/useParallax';
import { getCountryFlagUrl } from '@/utils/countries';
import { Move } from 'lucide-react';

interface ProfileHeroProps {
  profile: PublicProfileDto;
  accentColor: string;
  isOwner?: boolean;
  onSaveFocalY?: (focalY: number) => Promise<void>;
}

export function ProfileHero({ profile, accentColor, isOwner, onSaveFocalY }: ProfileHeroProps): React.JSX.Element {
  const reduced = useReducedMotion();
  const bannerRef = useParallax(0.15, 30) as React.RefObject<HTMLDivElement>;
  const displayName = profile.full_name || profile.username;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localFocalY, setLocalFocalY] = useState<number>(profile.banner_focal_y ?? 50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startY: number; startFocal: number } | null>(null);

  // Sync if profile changes from outside
  useEffect(() => {
    if (!editing) setLocalFocalY(profile.banner_focal_y ?? 50);
  }, [profile.banner_focal_y, editing]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editing) return;
      e.preventDefault();
      dragStateRef.current = { startY: e.clientY, startFocal: localFocalY };
    },
    [editing, localFocalY],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStateRef.current || !containerRef.current) return;
      const containerH = containerRef.current.getBoundingClientRect().height;
      const delta = e.clientY - dragStateRef.current.startY;
      const pct = (delta / containerH) * 100;
      const next = Math.min(100, Math.max(0, dragStateRef.current.startFocal + pct));
      setLocalFocalY(next);
    },
    [],
  );

  const onMouseUp = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  useEffect(() => {
    if (!editing) return;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [editing, onMouseMove, onMouseUp]);

  // Touch support
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!editing) return;
      const touch = e.touches[0];
      dragStateRef.current = { startY: touch.clientY, startFocal: localFocalY };
    },
    [editing, localFocalY],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragStateRef.current || !containerRef.current) return;
      const touch = e.touches[0];
      const containerH = containerRef.current.getBoundingClientRect().height;
      const delta = touch.clientY - dragStateRef.current.startY;
      const pct = (delta / containerH) * 100;
      const next = Math.min(100, Math.max(0, dragStateRef.current.startFocal + pct));
      setLocalFocalY(next);
    },
    [],
  );

  const onTouchEnd = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  useEffect(() => {
    if (!editing) return;
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [editing, onTouchMove, onTouchEnd]);

  const handleSave = async () => {
    if (!onSaveFocalY) return;
    setSaving(true);
    try {
      await onSaveFocalY(localFocalY);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalFocalY(profile.banner_focal_y ?? 50);
    setEditing(false);
  };

  const effectiveFocalY = editing ? localFocalY : (profile.banner_focal_y ?? 50);

  return (
    <div style={{ position: 'relative' }}>
      {/* Banner */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          height: 200,
          overflow: 'hidden',
          cursor: editing ? 'grab' : 'default',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div
          ref={editing ? undefined : bannerRef}
          style={{
            position: 'absolute',
            inset: editing ? '0' : '-30px 0 -30px 0',
          }}
        >
          {profile.banner_url ? (
            <img
              src={profile.banner_url}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `center ${effectiveFocalY}%`,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
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

        {/* Edit overlay */}
        {editing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backdropFilter: 'blur(1px)',
              pointerEvents: 'none',
            }}
          >
            <Move size={18} color="rgba(255,255,255,0.75)" />
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.75)',
                letterSpacing: '0.01em',
              }}
            >
              Drag to reposition
            </span>
          </div>
        )}

        {/* Edit action buttons */}
        {isOwner && profile.banner_url && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(0,0,0,0.55)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              letterSpacing: '0.01em',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.75)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.55)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
          >
            <Move size={13} />
            Adjust cover
          </button>
        )}

        {editing && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              right: 12,
              display: 'flex',
              gap: 8,
              pointerEvents: 'auto',
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              style={{
                padding: '6px 14px',
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => {
                e.stopPropagation();
                void handleSave();
              }}
              style={{
                padding: '6px 14px',
                background: saving ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.92)',
                border: '1px solid transparent',
                borderRadius: 6,
                color: '#0E0E12',
                fontSize: 12,
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                backdropFilter: 'blur(8px)',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {saving ? 'Saving…' : 'Save position'}
            </button>
          </div>
        )}
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
              {profile.country_code && (
                <img
                  src={getCountryFlagUrl(profile.country_code)}
                  alt={profile.country_code}
                  style={{ width: 18, height: 13, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
                />
              )}
              {profile.location && <span>{profile.location}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
