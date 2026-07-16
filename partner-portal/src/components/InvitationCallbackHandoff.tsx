import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { readInvitationTokenFromUrl, storeInvitationToken } from '@/lib/partnerInvitation';

export default function InvitationCallbackHandoff() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = readInvitationTokenFromUrl();
    if (!token || !/^[A-Fa-f0-9]{64}$/.test(token)) return;

    storeInvitationToken(token);
    const search = new URLSearchParams(location.search);
    search.delete('token');
    const nextSearch = search.size > 0 ? `?${search.toString()}` : '';
    navigate(`/invite/accept${nextSearch}${location.hash}`, { replace: true });
  }, [location.hash, location.search, navigate]);

  return null;
}