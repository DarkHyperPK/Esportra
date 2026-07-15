import React, { useMemo } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import InviteCodeRedemption from '@/components/tournament/InviteCodeRedemption';
import { normalizeInviteCode } from '@/utils/inviteCodeUtils';
import { ProfileLoading } from '@/components/profile/ProfileLoading';

const RedeemInvitePage: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialCode = useMemo(
    () => normalizeInviteCode(searchParams.get('code') || ''),
    [searchParams],
  );

  const returnPath = `${location.pathname}${location.search}`;

  if (loading) {
    return <ProfileLoading />;
  }

  if (!user) {
    return <Navigate to={`/auth/signin?redirect=${encodeURIComponent(returnPath)}`} replace />;
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <InviteCodeRedemption
        initialCode={initialCode}
        returnPath={returnPath}
        showTitle
      />
    </div>
  );
};

export default RedeemInvitePage;
