import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isBroadcastEligible } from '@/services/broadcast/broadcastSetup';
import type { useShowPreparation } from './useShowPreparation';

function read(key: string) { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } }
function remember(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch { /* URL navigation remains available. */ } }

/** Session-only navigation preferences; readiness derives from current queries. */
export function useBroadcastSetupNavigation(showId: string, prepared: ReturnType<typeof useShowPreparation>) {
  const [params, setParams] = useSearchParams();
  const key = `air-web-setup:${showId}:`;
  const step = Math.max(0, Math.min(7, Math.trunc(Number(params.get('step') ?? read(key + 'step')) || 0)));
  const [previewed, setPreviewed] = useState(() => read(key + 'previewed'));
  const selectedId = params.get('match') ?? read(key + 'match');
  const match = prepared.show?.matchSlots.find(slot => slot.matchId === selectedId && isBroadcastEligible(slot.matchStatus ?? slot.status));
  const screens = prepared.segments.data?.filter(segment => !segment.matchId || segment.matchId === match?.matchId) ?? [];
  const checks = [prepared.online > 0, !!match, !!match && previewed === match.matchId,
    !!match && screens.length > 0 && !prepared.segments.isError,
    !!prepared.sponsors.data?.length, !!prepared.talent.data?.length, !!prepared.crew.data?.crew.length,
    prepared.push.isSuccess && prepared.push.variables === match?.matchId];
  const reviewUnavailable = [prepared.segments, prepared.sponsors, prepared.talent, prepared.crew, prepared.nodes].some(query => query.isLoading || query.isError);
  const canPublish = !!match && screens.length > 0 && prepared.online > 0 && !reviewUnavailable && !prepared.push.isPending && !['ended', 'cancelled'].includes(prepared.show?.status || '');
  const blocked = step === 0 ? prepared.online === 0 : step === 1 || step === 2 ? !match : step === 3 ? !checks[3] : false;
  const blockedReason = step === 0 ? 'Connect Air on your production PC to continue.' : !match ? 'Choose an eligible match before continuing.' : 'Add at least one screen before continuing.';
  function select(index: number, matchId = match?.matchId) {
    remember(key + 'step', String(index));
    if (matchId) remember(key + 'match', matchId);
    if (matchId !== match?.matchId) { setPreviewed(''); remember(key + 'previewed', ''); }
    setParams(previous => { const next = new URLSearchParams(previous); next.set('step', String(index)); if (matchId) next.set('match', matchId); return next; });
  }
  function next() {
    if (step === 2 && match) { setPreviewed(match.matchId); remember(key + 'previewed', match.matchId); }
    select(step + 1);
  }
  return { step, match, checks, blocked, blockedReason, select, next, invalidMatch: !!selectedId && !match, canPublish };
}
