import React, { useEffect, useCallback } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { usePeekStore } from '@/stores/peekStore';
import { ProfilePeekSkeleton } from './ProfilePeekSkeleton';
import { ProfilePeekContent } from './ProfilePeekContent';
import { apiClient } from '@/lib/apiClient';
import type {
  PublicProfileDto,
  UserStatsDto,
  LinkedAccountsDto,
  TournamentHistoryEntryDto,
  TeamMembershipDto,
} from '@/types/profile';
import { AlertTriangle } from 'lucide-react';

/**
 * ProfilePeekSheet: global overlay panel, mounted once at app root.
 * Desktop: slides in from right edge, z-index 500.
 * Mobile: rises from bottom as a bottom sheet with drag-to-dismiss.
 * Animation begins immediately on open — skeleton shown before data arrives.
 */
export function ProfilePeekSheet(): React.JSX.Element {
  const { peekUserId, closePeek } = usePeekStore();
  const reduced = useReducedMotion();

  // Mobile drag-to-dismiss
  const dragY = useMotionValue(0);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePeek();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePeek]);

  const profileQuery = useQuery({
    queryKey: ['peek-profile', peekUserId],
    queryFn: () => apiClient.get<PublicProfileDto>(`/api/profiles/${peekUserId}`),
    enabled: !!peekUserId,
    staleTime: 5 * 60 * 1000,
  });

  const statsQuery = useQuery({
    queryKey: ['peek-stats', peekUserId],
    queryFn: () => apiClient.get<UserStatsDto>(`/api/profiles/${peekUserId}/stats`),
    enabled: !!peekUserId,
    staleTime: 5 * 60 * 1000,
  });

  const linkedQuery = useQuery({
    queryKey: ['peek-linked', peekUserId],
    queryFn: () => apiClient.get<LinkedAccountsDto>(`/api/profiles/${peekUserId}/linked-accounts`),
    enabled: !!peekUserId,
    staleTime: 5 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ['peek-history', peekUserId],
    queryFn: () =>
      apiClient.get<{ items: TournamentHistoryEntryDto[] }>(`/api/profiles/${peekUserId}/tournament-history?page=1`),
    enabled: !!peekUserId,
    staleTime: 5 * 60 * 1000,
  });

  const teamsQuery = useQuery({
    queryKey: ['peek-teams', peekUserId],
    queryFn: () => apiClient.get<TeamMembershipDto[]>(`/api/profiles/${peekUserId}/teams`),
    enabled: !!peekUserId,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    profileQuery.isLoading || statsQuery.isLoading || linkedQuery.isLoading;
  const isError =
    profileQuery.isError || statsQuery.isError || linkedQuery.isError;
  const isReady =
    profileQuery.data && statsQuery.data && linkedQuery.data;

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      const sheetHeight = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 500;
      const velocity = info.velocity.y;
      const offset = info.offset.y;

      if (velocity > 300 || offset > sheetHeight * 0.4) {
        closePeek();
      } else {
        dragY.set(0);
      }
    },
    [closePeek, dragY],
  );

  // Animation variants
  const desktopVariants = {
    initial: reduced ? { opacity: 0 } : { x: '100%' },
    animate: reduced
      ? { opacity: 1, transition: { duration: 0.1 } }
      : { x: 0, transition: { duration: 0.15, ease: [0, 0, 0.58, 1] } },
    exit: reduced
      ? { opacity: 0, transition: { duration: 0.1 } }
      : { x: '100%', transition: { duration: 0.12, ease: [0.42, 0, 1, 1] } },
  };

  const mobileVariants = {
    initial: reduced ? { opacity: 0 } : { y: '100%' },
    animate: reduced
      ? { opacity: 1, transition: { duration: 0.1 } }
      : { y: 0, transition: { duration: 0.15, ease: [0, 0, 0.58, 1] } },
    exit: reduced
      ? { opacity: 0, transition: { duration: 0.1 } }
      : { y: '100%', transition: { duration: 0.12, ease: [0.42, 0, 1, 1] } },
  };

  const retryAll = () => {
    void profileQuery.refetch();
    void statsQuery.refetch();
    void linkedQuery.refetch();
    void historyQuery.refetch();
    void teamsQuery.refetch();
  };

  return (
    <>
      <style>{`
        @media (hover: hover) {
          .peek-retry-link:hover {
            text-decoration: underline;
          }
        }
      `}</style>

      <AnimatePresence>
        {peekUserId && (
          <>
            {/* Mobile backdrop only */}
            <motion.div
              key="peek-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0, 0, 0.58, 1] }}
              onClick={closePeek}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,1)',
                zIndex: 499,
                display: 'none',
              }}
              className="peek-mobile-backdrop"
            />

            <style>{`
              @media (max-width: 767px) {
                .peek-mobile-backdrop { display: block !important; }
                .peek-desktop-panel  { display: none  !important; }
                .peek-mobile-panel   { display: flex  !important; }
              }
              @media (min-width: 768px) {
                .peek-mobile-backdrop { display: none  !important; }
                .peek-desktop-panel  { display: flex  !important; }
                .peek-mobile-panel   { display: none  !important; }
              }
            `}</style>

            {/* Desktop panel — slides from right */}
            <motion.div
              key="peek-desktop"
              className="peek-desktop-panel"
              variants={desktopVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                position: 'fixed',
                right: 0,
                top: 0,
                bottom: 0,
                width: 380,
                background: '#0E0E12',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                zIndex: 500,
                overflowY: 'auto',
                flexDirection: 'column',
              }}
            >
              {isLoading && <ProfilePeekSkeleton />}
              {isError && <PeekErrorState onRetry={retryAll} onClose={closePeek} />}
              {isReady && !isError && (
                <ProfilePeekContent
                  profile={profileQuery.data!}
                  stats={statsQuery.data!}
                  linkedAccounts={linkedQuery.data!}
                  tournamentHistory={historyQuery.data?.items ?? []}
                  teams={teamsQuery.data ?? []}
                  onClose={closePeek}
                />
              )}
            </motion.div>

            {/* Mobile bottom sheet — rises from bottom with drag-to-dismiss */}
            <motion.div
              key="peek-mobile"
              className="peek-mobile-panel"
              variants={mobileVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.3 }}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                maxHeight: 'min(70dvh, 70vh)',
                background: '#0E0E12',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px 12px 0 0',
                zIndex: 500,
                overflowY: 'auto',
                flexDirection: 'column',
                paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
                overscrollBehavior: 'contain',
                y: dragY,
              }}
              onDragEnd={handleDragEnd}
            >
              {/* Drag handle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 44,
                  flexShrink: 0,
                  cursor: 'grab',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.25)',
                  }}
                />
              </div>

              {isLoading && <ProfilePeekSkeleton />}
              {isError && <PeekErrorState onRetry={retryAll} onClose={closePeek} />}
              {isReady && !isError && (
                <ProfilePeekContent
                  profile={profileQuery.data!}
                  stats={statsQuery.data!}
                  linkedAccounts={linkedQuery.data!}
                  tournamentHistory={historyQuery.data?.items ?? []}
                  teams={teamsQuery.data ?? []}
                  onClose={closePeek}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function PeekErrorState({
  onRetry,
  onClose,
}: {
  onRetry: () => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div style={{ padding: 20 }}>
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)',
        }}
      >
        ✕
      </button>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          gap: 12,
          textAlign: 'center',
        }}
      >
        <AlertTriangle size={20} color="rgba(255,255,255,0.4)" />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Could not load profile
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="peek-retry-link"
          style={{
            fontSize: 12,
            color: '#7B61FF',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
