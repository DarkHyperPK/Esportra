import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAdminAccess } from '@/hooks/useAdminAccess';
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
import { type PlacementZone, requiredAssetRole } from './types';
import { TournamentView } from './TournamentView';
import { SponsorView } from './SponsorView';
import { PlacementModal } from './PlacementModal';
import { PlacementPreview } from './PlacementPreview';
import { AuditLog } from './AuditLog';
import { PlacementInventory } from './PlacementInventory';

type ViewMode = 'tournament' | 'sponsor' | 'placements' | 'audit';

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

type PendingAction = { type: 'delete'; id: string } | { type: 'remove'; placement: Placement } | { type: 'unassign'; placement: Placement };

export default function SponsorAdManager() {
  useAdminAccess();

  const [view, setView] = useState<ViewMode>('tournament');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Placement | null>(null);
  const [modalLocks, setModalLocks] = useState<{ sponsorId?: string; zone?: PlacementZone; tournamentId?: string | null }>({});
  const [previewTournamentId, setPreviewTournamentId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [replacing, setReplacing] = useState<Placement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const openModalForSponsor = (sponsorId: string) => {
    setEditing(null);
    setModalLocks({ sponsorId });
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

  const { toast } = useToast();
  const qc = useQueryClient();

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
  const actionLabel = pendingAction?.type === 'delete' ? 'Delete this placement permanently?' : pendingAction?.type === 'remove' ? 'Remove the creative? The slot will be kept as a draft.' : 'Unassign this placement and free the slot?';

  return (
    <div className="min-h-screen bg-transparent text-white p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sponsor Ad Manager</h1>
        <p className="text-sm text-zinc-500 mt-1">Assign sponsors to placement zones across tournaments and global pages.</p>
      </div>

      {/* View switcher */}
      <div className="flex items-center mb-6">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setView('tournament')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'tournament' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            By Tournament
          </button>
          <button
            onClick={() => setView('sponsor')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'sponsor' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            By Sponsor
          </button>
          <button
            onClick={() => setView('placements')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'placements' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Active Placements
          </button>
          <button
            onClick={() => setView('audit')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === 'audit' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Audit Log
          </button>
        </div>
      </div>

      {/* Active view */}
      {view === 'tournament' ? (
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
          onAssign={openModalForSponsor}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onReplace={handleReplace}
          onRemove={handleRemove}
          onUnassign={handleUnassign}
        />
      ) : view === 'placements' ? <PlacementInventory onEdit={openEditModal} onDelete={handleDelete} onReplace={handleReplace} onRemove={handleRemove} onUnassign={handleUnassign} />
      : <AuditLog />}

      {/* Modal (used for By Sponsor flow + editing) */}
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
      />

      {/* Preview Modal */}
      <PlacementPreview
        open={!!previewTournamentId}
        onClose={() => setPreviewTournamentId(null)}
        placements={previewPlacements}
        tournamentName={previewTournament?.name ?? 'Tournament'}
      />

      {/* Hidden file input for replace creative */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Confirmation dialog */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <h3 id="confirm-title" className="text-lg font-bold text-white">Confirm action</h3>
            <p className="mt-2 text-sm text-zinc-400">{actionLabel}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setPendingAction(null)} className="rounded px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={confirmAction} className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Replace loading indicator */}
      {(uploadMutation.isPending || replaceMutation.isPending) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-zinc-900 border border-zinc-700 px-6 py-4 text-sm text-white">
            {uploadMutation.isPending ? 'Uploading creative…' : 'Replacing…'}
          </div>
        </div>
      )}
    </div>
  );
}
