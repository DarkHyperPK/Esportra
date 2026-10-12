import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CommandShell, CommandPageGrid, CommandHeader, CommandSection, CommandButton,
} from '@/components/management/CommandSurface';
import { InlineNotice } from '@/components/ui/kit/InlineNotice';
import { useAcceptCrewInvite } from '@/hooks/useBroadcastCrew';
import { getApiErrorMessage } from '@/lib/apiClient';

const ROLE_LABELS: Record<string, string> = {
  producer:           'Producer',
  observer:           'Observer',
  monitor:            'Match Monitor',
  technical_director: 'Technical Director',
  replay_operator:    'Replay Operator',
};

export default function BroadcastCrewJoinPage() {
  const navigate = useNavigate();
  const accept = useAcceptCrewInvite();

  const [token, setToken] = useState('');
  const [accepted, setAccepted] = useState<{ showId: string; role: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Token is in the URL fragment: /broadcast/join#token=<raw>
    // Fragments never reach the server — they stay client-side only.
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const raw = params.get('token');
    if (raw) setToken(raw);
  }, []);

  async function handleAccept() {
    if (!token) return;
    setError('');
    try {
      const result = await accept.mutateAsync(token);
      setAccepted(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'This invite link has expired or already been used.'));
    }
  }

  if (accepted) {
    const roleLabel = ROLE_LABELS[accepted.role] ?? accepted.role;
    return (
      <CommandShell>
        <CommandPageGrid>
          <CommandHeader
            title="You're in"
            description={`Joined as ${roleLabel}`}
          />
          <CommandSection>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              <InlineNotice tone="success">
                {`You've joined the broadcast crew as ${roleLabel}.`}
              </InlineNotice>
              <CommandButton
                onClick={() => navigate(`/broadcast/shows/${accepted.showId}`)}
              >
                Open Show
              </CommandButton>
            </motion.div>
          </CommandSection>
        </CommandPageGrid>
      </CommandShell>
    );
  }

  return (
    <CommandShell>
      <CommandPageGrid>
        <CommandHeader
          title="Join Broadcast Crew"
          description="Accept your invite to join this show's production team"
        />
        <CommandSection>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            {!token && (
              <InlineNotice tone="warning">
                No invite token found. Make sure you opened the full invite link.
              </InlineNotice>
            )}
            {error && (
              <InlineNotice tone="critical">{error}</InlineNotice>
            )}
            <CommandButton
              onClick={handleAccept}
              disabled={!token || accept.isPending}
            >
              {accept.isPending ? 'Accepting…' : 'Accept Invite'}
            </CommandButton>
          </motion.div>
        </CommandSection>
      </CommandPageGrid>
    </CommandShell>
  );
}
