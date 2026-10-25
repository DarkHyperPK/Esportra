import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { CompetitiveProfile } from '@/types/competitive';
import type { LinkedAccountsDto } from '@/types/profile';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CompetitiveTabContent } from './CompetitiveTabContent';

/**
 * CompetitiveCredentialsTab — Surface 4 (PROJ-075)
 *
 * Shell component: handles loading/empty/hidden states.
 * Filled state delegates to CompetitiveTabContent.
 * Motion: Arrive 180ms (0.2,0,0,1) on tab open; reduced motion → instant.
 */

interface Props {
  profile: CompetitiveProfile | null;
  isLoading: boolean;
  isOwnProfile: boolean;
  linkedAccounts: LinkedAccountsDto | null;
}

function CredentialsSkeleton() {
  return (
    <div className="max-w-[600px]">
      <div className="h-24 w-24 bg-white/[0.06] mb-3" />
      <div className="h-6 w-36 bg-white/[0.06] mb-2" />
      <div className="h-4 w-48 bg-white/[0.04] mb-6" />
      <div className="h-3 w-16 bg-white/[0.04] mb-2" />
      <div className="flex gap-2 mb-6">
        <div className="h-9 w-24 bg-white/[0.04]" />
        <div className="h-9 w-24 bg-white/[0.04]" />
      </div>
      <div className="h-3 w-20 bg-white/[0.04] mb-2" />
      <div className="flex gap-2">
        <div className="h-9 w-28 bg-white/[0.04]" />
        <div className="h-9 w-16 bg-white/[0.04]" />
      </div>
    </div>
  );
}

export function CompetitiveCredentialsTab({
  profile,
  isLoading,
  isOwnProfile,
  linkedAccounts,
}: Props): React.JSX.Element {
  const reduced = useReducedMotion();

  if (isLoading) {
    return <CredentialsSkeleton />;
  }

  if (!isOwnProfile && profile === null) {
    return (
      <div className="py-12 text-center text-[14px] text-white/35">
        No competitive profile yet.
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="py-12 text-center">
        <Link
          to="/competitive/profile/edit"
          className="text-[14px] text-rose-500 hover:text-rose-400 transition-colors"
        >
          Set up your competitive profile
        </Link>
        <p className="text-[12px] text-white/35 mt-2">
          Show your rank, roles, and availability to potential teammates.
        </p>
      </div>
    );
  }

  const arriveVariants = {
    initial: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.18, ease: [0.2, 0, 0, 1] as number[] },
    },
  };

  return (
    <motion.div
      variants={arriveVariants}
      initial="initial"
      animate="animate"
      className="max-w-[600px]"
    >
      <CompetitiveTabContent
        profile={profile}
        isOwnProfile={isOwnProfile}
        linkedAccounts={linkedAccounts}
      />
    </motion.div>
  );
}
