import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { PublicProfileDto } from '@/types/profile';
import { useParallax } from '@/hooks/useParallax';
import { getCountryFlagUrl } from '@/utils/countries';
import { Move, GripHorizontal } from 'lucide-react';

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 200;

interface ProfileHeroProps {
  profile: PublicProfileDto;
  accentColor: string;
  isOwner?: boolean;
  onSaveAppearance?: (focalY: number, zoom: number, height: number) => Promise<void>;
}

export function ProfileHero({ profile, accentColor, isOwner, onSaveAppearance }: ProfileHeroProps): React.JSX.Element {
  const reduced = useReducedMotion();
  const bannerRef = useParallax(0.15, 30) as React.RefObject<HTMLDivElement>;
  const displayName = profile.full_name || profile.username;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localFocalY, setLocalFocalY] = useState<number>(profile.banner_focal_y ?? 50);
  const [localZoom, setLocalZoom] = useState<number>(profile.banner_zoom ?? 1);
  const [localHeight, setLocalHeight] = useState<number>(profile.banner_height ?? DEFAULT_HEIGHT);

  const containerRef = useRef<HTMLDivElement>(null);

  // Two independent drag refs — pan vs resize
  const panRef = useRef<{ startY: number; startFocal: number } | null>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    if (!editing) {
      setLocalFocalY(profile.banner_focal_y ?? 50);
      setLocalZoom(profile.banner_zoom ?? 1);
      setLocalHeight(profile.banner_height ?? DEFAULT_HEIGHT);
    }
  }, [profile.banner_focal_y, profile.banner_zoom, profile.banner_height, editing]);

  // ── Pan (image reposition) ────────────────────────────────────────────────
  const onBannerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!editing || resizeRef.current) return;
      e.preventDefault();
      panRef.current = { startY: e.clientY, startFocal: localFocalY };
    },
    [editing, localFocalY],
  );

  const onBannerTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!editing || resizeRef.current) return;
      const t = e.touches[0];
      panRef.current = { startY: t.clientY, startFocal: localFocalY };
    },
    [editing, localFocalY],
  );

  // ── Resize (height) ───────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resizeRef.current = { startY: e.clientY, startHeight: localHeight };
    },
    [localHeight],
  );

  const onResizeTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      const t = e.touches[0];
      resizeRef.current = { startY: t.clientY, startHeight: localHeight };
    },
    [localHeight],
  );

  // ── Global move / up ──────────────────────────────────────────────────────
  const onWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (resizeRef.current) {
        const delta = e.clientY - resizeRef.current.startY;
        const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeRef.current.startHeight + delta));
        setLocalHeight(next);
        return;
      }
      if (panRef.current && containerRef.current) {
        const containerH = containerRef.current.getBoundingClientRect().height;
        const delta = e.clientY - panRef.current.startY;
        const pct = (delta / containerH) * 100;
        setLocalFocalY(Math.min(100, Math.max(0, panRef.current.startFocal + pct)));
      }
    },
    [],
  );

  const onWindowTouchMove = useCallback(
    (e: TouchEvent) => {
      const t = e.touches[0];
      if (resizeRef.current) {
        const delta = t.clientY - resizeRef.current.startY;
        const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, resizeRef.current.startHeight + delta));
        setLocalHeight(next);
        return;
      }
      if (panRef.current && containerRef.current) {
        const containerH = containerRef.current.getBoundingClientRect().height;
        const delta = t.clientY - panRef.current.startY;
        const pct = (delta / containerH) * 100;
        setLocalFocalY(Math.min(100, Math.max(0, panRef.current.startFocal + pct)));
      }
    },
    [],
  );

  const onWindowUp = useCallback(() => {
    panRef.current = null;
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    if (!editing) return;
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowUp);
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', onWindowUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowUp);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', onWindowUp);
    };
  }, [editing, onWindowMouseMove, onWindowTouchMove, onWindowUp]);

  // ── Save / Cancel ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!onSaveAppearance) return;
    setSaving(true);
    try {
      await onSaveAppearance(localFocalY, localZoom, localHeight);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalFocalY(profile.banner_focal_y ?? 50);
    setLocalZoom(profile.banner_zoom ?? 1);
    setLocalHeight(profile.banner_height ?? DEFAULT_HEIGHT);
    setEditing(false);
  };

  const focalY = editing ? localFocalY : (profile.banner_focal_y ?? 50);
  const zoom = editing ? localZoom : (profile.banner_zoom ?? 1);
  const height = editing ? localHeight : (profile.banner_height ?? DEFAULT_HEIGHT);

  return (
    <div style={{ position: 'relative' }}>
      {/* Banner container — height is dynamic */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          height,
          overflow: 'hidden',
          cursor: editing ? 'grab' : 'default',
          userSelect: 'none',
        }}
        onMouseDown={onBannerMouseDown}
        onTouchStart={onBannerTouchStart}
      >
        {/* Image / gradient */}
        <div
          ref={editing ? undefined : bannerRef}
          style={{ position: 'absolute', inset: editing ? '0' : '-30px 0 -30px 0' }}
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
                objectPosition: `center ${focalY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: `center ${focalY}%`,
                pointerEvents: 'none',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a24 0%, #0E0E12 100%)' }} />
          )}
        </div>

        {/* Edit hint overlay */}
        {editing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.32)',
              backdropFilter: 'blur(1px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              pointerEvents: 'none',
            }}
          >
            <Move size={18} color="rgba(255,255,255,0.7)" />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.01em' }}>
              Drag to reposition
            </span>
          </div>
        )}

        {/* Adjust cover button (view mode) */}
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
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
          >
            <Move size={13} />
            Adjust cover
          </button>
        )}

        {/* Edit controls bar */}
        {editing && (
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 12,
              right: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              pointerEvents: 'auto',
            }}
          >
            {/* Zoom slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', minWidth: 160, maxWidth: 220 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={localZoom}
                onChange={(e) => setLocalZoom(Number(e.target.value))}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{ flex: 1, cursor: 'pointer', accentColor: 'rgba(255,255,255,0.85)' }}
              />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter, sans-serif', width: 32, textAlign: 'right' }}>
                {localZoom.toFixed(1)}×
              </span>
            </div>

            {/* Height readout */}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
              {Math.round(localHeight)}px
            </span>

            <div style={{ flex: 1 }} />

            {/* Cancel / Save */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
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
              onClick={(e) => { e.stopPropagation(); void handleSave(); }}
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
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Resize handle — only in edit mode, sits below the banner */}
      {editing && (
        <div
          onMouseDown={onResizeMouseDown}
          onTouchStart={onResizeTouchStart}
          style={{
            height: 16,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderTop: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'ns-resize',
            userSelect: 'none',
          }}
        >
          <GripHorizontal size={14} color="rgba(255,255,255,0.3)" />
        </div>
      )}

      {/* Avatar — overlaps banner bottom by 40px */}
      <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ position: 'absolute', top: -40, left: 24 }}>
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
              <img src={profile.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

        <div style={{ paddingTop: 88 }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 28, color: '#FFFFFF', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {displayName}
          </h1>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            @{profile.username}
          </div>
          {(profile.country_code || profile.location) && (
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
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
