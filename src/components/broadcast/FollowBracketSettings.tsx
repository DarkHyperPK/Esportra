import { useEffect, useRef, useState } from 'react';
import { useBroadcastEnrollment } from '@/hooks/useBroadcastEnrollment';
import { getApiErrorMessage } from '@/lib/apiClient';
import { CommandButton } from '@/components/management/CommandSurface';
export function FollowBracketSettings({ showId, locked }: { showId: string; locked: boolean }) {
  const { query, save } = useBroadcastEnrollment(showId);
  const [enabled, setEnabled] = useState(false), [stages, setStages] = useState<string[]>([]), [revision, setRevision] = useState(0), [error, setError] = useState('');
  const loaded = useRef(false);
  useEffect(() => { if (query.data && !loaded.current) { loaded.current = true; setEnabled(query.data.enabled); setStages(query.data.stageIds); setRevision(query.data.revision); } }, [query.data]);
  const disabled = locked || !query.data || save.isPending;
  return <details className="setup-help"><summary>Follow bracket stages</summary>
    <p className="setup-hint">Optional. Eligible matches from these stages join this show as the bracket advances. Played matches stay hidden. Each match still needs your screen selection and an operator to start it. Removed eligible matches rejoin while following is on.</p>
    {query.isLoading && <p role="status">Loading tournament stages…</p>}
    {query.isError && <p role="alert">Could not load stage following. <CommandButton onClick={() => void query.refetch()}>Retry</CommandButton></p>}
    <label><input type="checkbox" disabled={disabled} checked={enabled} onChange={event => setEnabled(event.target.checked)} /> Automatically include upcoming matches</label>
    {query.data?.stages.map(stage => <label className="setup-library-row" key={stage.id}><input type="checkbox" disabled={disabled || !enabled} checked={stages.includes(stage.id)} onChange={event => setStages(previous => event.target.checked ? [...previous, stage.id] : previous.filter(id => id !== stage.id))} /> {stage.name}</label>)}
    {query.data?.stages.length === 0 && <p className="setup-hint">No stages are available in this tournament yet. You can still choose a single eligible match.</p>}
    {query.data?.atCapacity && <p role="status">Show limit reached: 200 matches. Create another show for additional matches.</p>}
    {query.data?.error && <p role="status">{query.data.error}</p>}
    <CommandButton disabled={disabled || enabled && stages.length === 0} onClick={() => void save.mutateAsync({ enabled, stageIds: stages, revision }).then(result => { setRevision(result.revision); setError(''); if (result.atCapacity) setError('Show limit reached: 200 matches.'); }).catch(failure => setError(getApiErrorMessage(failure, 'Could not save stage following.')))}>Save stage following</CommandButton>
    {save.isSuccess && <p role="status">Stage following saved. Stopping it keeps already included matches.</p>}
    {!!error && <p role="alert">{error} <CommandButton onClick={() => void query.refetch().then(result => { if (result.data) { setEnabled(result.data.enabled); setStages(result.data.stageIds); setRevision(result.data.revision); } setError(''); })}>Reload stage settings</CommandButton></p>}
  </details>;
}
