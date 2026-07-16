import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { readInvitationTokenFromUrl, storeInvitationToken } from '@/lib/partnerInvitation';

export default function InvitationCallbackHandoff() {
  const location = useLocation();

  useEffect(() => {
    const token = readInvitationTokenFromUrl();
    if (!token || !/^[A-Fa-f0-9]{64}$/.test(token)) return;

    storeInvitationToken(token);
    const search = new URLSearchParams(location.search);
    search.delete('token');
    const nextSearch = search.size > 0 ? `?${search.toString()}` : '';
    window.history.replaceState(window.history.state, '', `/invite/accept${nextSearch}${location.hash}`);
  }, [location.hash, location.search]);

  return null;
}