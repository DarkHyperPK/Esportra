import { useState, useEffect } from 'react';
import type { Placement } from '@/hooks/useAdminPlacements';
import { useResolvePlacementReview } from '@/hooks/useAdminPlacements';
import { type PlacementZone, ZONE_META } from './types';

interface Tournament { id: string; name: string; }
interface Props { placement: Placement | null; tournaments: Tournament[]; onClose: () => void; }

export function ResolvePlacementDialog({ placement, tournaments, onClose }: Props) {
  const [zone, setZone] = useState<PlacementZone>(placement?.placementZone ?? 'wide_partner');
  const [tournamentId, setTournamentId] = useState(placement?.tournamentId ?? '');
  const [slotNumber, setSlotNumber] = useState(1);
  const mutation = useResolvePlacementReview();

  useEffect(() => {
    if (placement) {
      setZone(placement.placementZone ?? 'wide_partner');
      setTournamentId(placement.tournamentId ?? '');
      setSlotNumber(1);
    }
  }, [placement]);
  if (!placement) return null;
  const meta = ZONE_META[zone];
  const submit = () => mutation.mutate({ id: placement.id, placementZone: zone, tournamentId: meta.isGlobal ? null : tournamentId, slotNumber }, { onSuccess: onClose });

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="resolve-title">
    <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5">
      <h3 id="resolve-title" className="text-lg font-bold text-white">Resolve placement review</h3>
      <p className="mt-1 text-xs text-amber-400">Reason: {placement.reviewReason?.replace('_', ' ') || 'invalid assignment'}</p>
      <div className="mt-5 space-y-4">
        <label className="block text-xs text-zinc-400">Zone<select value={zone} onChange={event => { setZone(event.target.value as PlacementZone); setSlotNumber(1); }} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-white">{Object.entries(ZONE_META).map(([value, valueMeta]) => <option key={value} value={value}>{valueMeta.label}</option>)}</select></label>
        {!meta.isGlobal && <label className="block text-xs text-zinc-400">Tournament<select value={tournamentId} onChange={event => setTournamentId(event.target.value)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-white"><option value="">Select tournament</option>{tournaments.map(tournament => <option key={tournament.id} value={tournament.id}>{tournament.name}</option>)}</select></label>}
        <label className="block text-xs text-zinc-400">Slot<select value={slotNumber} onChange={event => setSlotNumber(Number(event.target.value))} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-white">{Array.from({ length: meta.maxSlots }, (_, index) => <option key={index + 1} value={index + 1}>Slot {index + 1}</option>)}</select></label>
      </div>
      {mutation.isError && <p className="mt-3 text-xs text-red-400">{mutation.error.message}</p>}
      <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded px-4 py-2 text-sm text-zinc-400">Cancel</button><button onClick={submit} disabled={mutation.isPending || (!meta.isGlobal && !tournamentId)} className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40">{mutation.isPending ? 'Resolving…' : 'Resolve'}</button></div>
    </div>
  </div>;
}