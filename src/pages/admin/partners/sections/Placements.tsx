import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import {
  useCreatePlacement,
  useUpdatePlacement,
  useDeletePlacement,
  useUploadPlacementAsset,
  useReplaceCreative,
  useRemoveCreative,
  useUnassignPlacement,
  useTournamentPlacements,
  type Placement,
  type CreatePlacementPayload,
  type UpdatePlacementPayload,
} from '@/hooks/useAdminPlacements';
import { type PlacementZone, requiredAssetRole } from '../../tools/SponsorAdManager/types';
import { TournamentView } from '../../tools/SponsorAdManager/TournamentView';
import { SponsorView } from '../../tools/SponsorAdManager/SponsorView';
import { PlacementModal } from '../../tools/SponsorAdManager/PlacementModal';
import { PlacementPreview } from '../../tools/SponsorAdManager/PlacementPreview';
import { PlacementInventory } from '../../tools/SponsorAdManager/PlacementInventory';
import { HomepageTickerView } from '../../tools/SponsorAdManager/HomepageTickerView';
import { PartnersPageView } from '../../tools/SponsorAdManager/PartnersPageView';

interface SponsorOption {
  id: string;
  name: string;
  tier: string;
  logo_url?: string;
}

interface TournamentOption {
  id: string;
  name: string;
}

type PendingAction =
  | { type: 'delete'; id: string }
  | { type: 'remove'; placement: Placement }
  | { type: 'unassign'; placement: Placement };

type ZoneView = 'ticker' | 'partners' | 'tournament' | 'sponsor' | 'placements';

const ZONE_TABS: { key: ZoneView; label: string }[] = [
  { key: 'tournament', label: 'By Tournament' },
  { key: 'sponsor', label: 'By Sponsor' },
  { key: 'ticker', label: 'Homepage Ticker' },
  { key: 'partners', label: 'Partners Page' },
  { key: 'placements', label: 'Active Inventory' },
];

const PlacementsSection = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramView = searchParams.get('view') as ZoneView | null;
  const paramSponsor = searchParams.get('sponsor') ?? undefined;

  const [view, setView] = useState<ZoneView>(paramSponsor ? 'sponsor' : (paramView ?? 'tournament'));
  const [selectedSponsorId, setSelectedSponsorId] = useState<string | undefined>(paramSponsor);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Placement | null>(null);
  const [modalLocks, setModalLocks] = useState<{ sponsorId?: string; zone?: PlacementZone; tournamentId?: string | null; slotNumber?: number }>({});
  const [previewTournamentId, setPreviewTournamentId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [replacing, setReplacing] = useState<Placement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paramSponsor) setSelectedSponsorId(paramSponsor);
    if (paramView && ZONE_TABS.some(t => t.key === paramView)) setView(paramView);
  }, [paramSponsor, paramView]);

  const setZone = (next: ZoneView) => {
    setView(next);
    const params = new URLSearchParams(searchParams);
    params.set('view', next);
    params.delete('sponsor');
    setSearchParams(params, { replace: true });
  };

  const { data: sponsors = [] } = useQuery({
    queryKey: ['admin', 'sponsors-list'],
    queryFn: async () => {
      const res = await apiClient.get<SponsorOption[]>('/api/sponsors');
      return Array.isArray(res) ? res : [];
    },
  });

  const { data: tournaments = [] } = useQuery({
    queryKey: ['admin', 'tournaments-list'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: TournamentOption[] }>('/api/admin/tournaments?limit=100');
      return Array.isArray(res) ? res : (res?.data ?? []);
    },
  });

  const { data: previewPlacements = [] } = useTournamentPlacements(previewTournamentId ?? '');

  const createMutation = useCreatePlacement();
  const updateMutation = useUpdatePlacement();
  const deleteMutation = useDeletePlacement();
  const uploadMutation = useUploadPlacementAsset();
  const replaceMutation = useReplaceCreative();
  const removeMutation = useRemoveCreative();
  const unassignMutation = useUnassignPlacement();

  const { toast } = useToast();
  const qc = useQueryClient();

  const openModalForSponsor = (sponsorId: string) => {
    setEditing(null);
    setModalLocks({ sponsorId });
    setModalOpen(true);
  };

  const openPartnersSlotModal = (slotNumber: number) => {
    setEditing(null);
    setModalLocks({ zone: 'partner_showcase', slotNumber });
    setModalOpen(true);
  };

  const openTickerSlotModal = (slotNumber: number) => {
    setEditing(null);
    setModalLocks({ zone: 'homepage_ticker', slotNumber });
    setModalOpen(true);
  };

  const openEditModal = (placement: Placement) => {
    setEditing(placement);
    setModalLocks({});
    setModalOpen(true);
  };

  const handleDelete = (id: string) => setPendingAction({ type: 'delete', id });
  const handleRemove = (placement: Placement) => setPendingAction({ type: 'remove', placement });
  const handleUnassign = (placement: Placement) => setPendingAction({ type: 'unassign', placement });

  const handleReplace = (placement: Placement) => {
    setReplacing(placement);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacing) return;
    e.target.value = '';

    try {
      const zone = replacing.placementZone;
      const assetRole = requiredAssetRole(zone);
      const { assetId } = await uploadMutation.mutateAsync({ file, zone, assetRole });
      await replaceMutation.mutateAsync({ id: replacing.id, assetId });
    } finally {
      setReplacing(null);
    }
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'delete') deleteMutation.mutate(pendingAction.id);
    else if (pendingAction.type === 'remove') removeMutation.mutate(pendingAction.placement.id);
    else if (pendingAction.type === 'unassign') unassignMutation.mutate(pendingAction.placement.id);
    setPendingAction(null);
  };

  const handleModalSubmit = (payload: CreatePlacementPayload | (UpdatePlacementPayload & { id: string })) => {
    if ('id' in payload && payload.id) {
      updateMutation.mutate(payload as UpdatePlacementPayload & { id: string }, { onSuccess: () => setModalOpen(false) });
    } else {
      createMutation.mutate(payload as CreatePlacementPayload, {
        onSuccess: () => setModalOpen(false),
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            const body = error.body as { existingId?: string } | undefined;
            if (body?.existingId) {
              toast({ title: 'Placement already exists', description: 'Opening it for editing.' });
              setModalOpen(false);
              apiClient.get<Placement>(`/api/admin/placements/${body.existingId}`).then(existing => {
                openEditModal(existing);
                qc.invalidateQueries({ queryKey: ['admin-placements'] });
              });
              return;
            }
          }
          toast({ title: 'Failed to create placement', description: error.message, variant: 'destructive' });
        },
      });
    }
  };

  const previewTournament = tournaments.find(t => t.id === previewTournamentId);
  const actionLabel = pendingAction?.type === 'delete'
    ? 'Delete this placement permanently?'
    : pendingAction?.type === 'remove'
      ? 'Remove the creative? The slot will be kept as a draft.'
      : 'Unassign this placement and free the slot?';

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-1" data-lenis-prevent>
        {ZONE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setZone(tab.key)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
              view === tab.key ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'ticker' ? (
        <HomepageTickerView
          onAssignSlot={openTickerSlotModal}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onReplace={handleReplace}
          onRemove={handleRemove}
          onUnassign={handleUnassign}
        />
      ) : view === 'partners' ? (
        <PartnersPageView
          onAssignSlot={openPartnersSlotModal}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onReplace={handleReplace}
          onRemove={handleRemove}
          onUnassign={handleUnassign}
        />
      ) : view === 'tournament' ? (
        <TournamentView
          tournaments={tournaments}
          sponsors={sponsors}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onReplace={handleReplace}
          onRemove={handleRemove}
          onUnassign={handleUnassign}
          onPreview={setPreviewTournamentId}
        />
      ) : view === 'sponsor' ? (
        <SponsorView
          sponsors={sponsors}
          initialSponsorId={selectedSponsorId}
          onAssign={openModalForSponsor}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onReplace={handleReplace}
          onRemove={handleRemove}
          onUnassign={handleUnassign}
        />
      ) : (
        <PlacementInventory onEdit={openEditModal} onDelete={handleDelete} onReplace={handleReplace} onRemove={handleRemove} onUnassign={handleUnassign} />
      )}

      <PlacementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        sponsors={sponsors}
        tournaments={tournaments}
        editing={editing}
        lockedSponsorId={modalLocks.sponsorId}
        lockedZone={modalLocks.zone}
        lockedTournamentId={modalLocks.tournamentId}
        lockedSlotNumber={modalLocks.slotNumber}
      />

      <PlacementPreview
        open={!!previewTournamentId}
        onClose={() => setPreviewTournamentId(null)}
        placements={previewPlacements}
        tournamentName={previewTournament?.name ?? 'Tournament'}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
      />

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <h3 id="confirm-title" className="text-lg font-bold text-white">Confirm action</h3>
            <p className="mt-2 text-sm text-zinc-400">{actionLabel}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPendingAction(null)} className="rounded px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white">Cancel</button>
              <button onClick={confirmAction} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {(uploadMutation.isPending || replaceMutation.isPending) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-4 text-sm text-white">
            {uploadMutation.isPending ? 'Uploading creative…' : 'Replacing…'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementsSection;
