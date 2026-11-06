import { useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { useUpdateSessionLobby } from '@/hooks/competitive/useScrims';
import { ApiError, getApiErrorMessage } from '@/lib/apiClient';
import { getLobbyFormat } from '@/services/gameLobbyFormat';
import { ROOM_EYEBROW, ROOM_FIELD, ROOM_GHOST, ROOM_PANEL } from './roomStyles';
import type { ScrimSession } from '@/types/competitive';

function getLobbyFieldValues(s: ScrimSession) {
  return s.gameSlug === 'cs2'
    ? { field1: s.serverInfo ?? '', field2: s.lobbyCode ?? '' }
    : { field1: s.lobbyCode ?? '', field2: s.serverInfo ?? '' };
}

function fieldsToPayload(gameSlug: string | null, f1: string, f2: string) {
  return gameSlug === 'cs2'
    ? { serverInfo: f1 || undefined, lobbyCode: f2 || undefined }
    : { lobbyCode: f1 || undefined, serverInfo: f2 || undefined };
}


export function ScrimLobbyPanel({ session, isStaff }: { session: ScrimSession; isStaff: boolean }) {
  const fmt = getLobbyFormat(session.gameSlug ?? '');
  const saved = getLobbyFieldValues(session);
  const [f1, setF1] = useState(saved.field1);
  const [f2, setF2] = useState(saved.field2);
  const [flash, setFlash] = useState(false);
  const update = useUpdateSessionLobby(session.id);
  const locked = session.status === 'completed' || session.status === 'cancelled';
  const dirty = f1 !== saved.field1 || f2 !== saved.field2;
  const errorMessage = update.isError
    ? update.error instanceof ApiError && update.error.status === 403
      ? 'Only team captains or managers can update lobby info. Ask your captain or manager.'
      : getApiErrorMessage(update.error, 'Could not save lobby info. Try again.')
    : '';

  async function save() {
    setFlash(false);
    try {
      await update.mutateAsync(fieldsToPayload(session.gameSlug, f1, f2));
      setFlash(true);
      setTimeout(() => setFlash(false), 2000);
    } catch { /* shown via update.isError */ }
  }

  return (
    <div className={ROOM_PANEL}>
      <p className={ROOM_EYEBROW}>Lobby</p>
      {locked || !isStaff ? (
        <div className="space-y-3">
          {[{ label: fmt.fieldOneLabel, val: f1 }, ...(fmt.fieldTwo ? [{ label: fmt.fieldTwo.label, val: f2 }] : [])].map(({ label, val }) => (
            <div key={label} className="space-y-1">
              <p className="text-[11px] text-white/40">{label}</p>
              <p className="text-[14px] text-white/70">{val || <span className="text-white/25">—</span>}</p>
            </div>
          ))}
          {locked ? (
            <p className="text-[11px] text-white/30">Session ended.</p>
          ) : (
            <InlineNotice tone="neutral">Only team captains or managers can update lobby info. Ask your captain or manager.</InlineNotice>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="lf1" className="block text-[11px] text-white/40">{fmt.fieldOneLabel}</label>
            <input
              id="lf1"
              value={f1}
              onChange={(e) => setF1(fmt.fieldOneUppercase ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={fmt.fieldOneHint}
              autoComplete="off"
              className={`${ROOM_FIELD}${fmt.fieldOneUppercase ? ' font-mono tracking-wider' : ''}`}
            />
          </div>
          {fmt.fieldTwo && (
            <div className="space-y-1">
              <label htmlFor="lf2" className="block text-[11px] text-white/40">{fmt.fieldTwo.label}</label>
              <input id="lf2" value={f2} onChange={(e) => setF2(e.target.value)} placeholder={fmt.fieldTwo.hint} className={ROOM_FIELD} />
            </div>
          )}
          <p className="text-[11px] text-white/30">A captain or manager from either team can update this.</p>
          {dirty && (
            <div className="flex justify-end mt-2">
              <button onClick={save} disabled={update.isPending} className={ROOM_GHOST}>
                {update.isPending ? 'Saving…' : 'Save lobby info'}
              </button>
            </div>
          )}
          {flash && <InlineNotice tone="success">Lobby info saved.</InlineNotice>}
          {errorMessage && <InlineNotice tone="critical">{errorMessage}</InlineNotice>}
        </div>
      )}
    </div>
  );
}

