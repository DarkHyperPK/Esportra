import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  useCreatePlacement,
  useUpdatePlacement,
  useDeletePlacement,
  useTournamentPlacements,
  type Placement,
  type CreatePlacementPayload,
  type UpdatePlacementPayload,
} from '@/hooks/useAdminPlacements';
import { type PlacementZone } from './types';
import { TournamentView } from './TournamentView';
import { SponsorView } from './SponsorView';
import { PlacementModal } from './PlacementModal';
import { PlacementPreview } from './PlacementPreview';

type ViewMode = 'tournament' | 'sponsor';

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

export default function SponsorAdManager() {
  useAdminAccess();

  const [view, setView] = useState<ViewMode>('tournament');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Placement | null>(null);
  const [modalDefaults, setModalDefaults] = useState<{ zone?: PlacementZone; tournamentId?: string | null }>({});
  const [previewTournamentId, setPreviewTournamentId] = useState<string | null>(null);

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

  const openAssignModal = (zone?: PlacementZone, tournamentId?: string | null) => {
    setEditing(null);
    setModalDefaults({ zone, tournamentId });
    setModalOpen(true);
  };

  const openEditModal = (placement: Placement) => {
    setEditing(placement);
    setModalDefaults({});
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Remove this placement?')) deleteMutation.mutate(id);
  };

  const handleModalSubmit = (payload: CreatePlacementPayload | (UpdatePlacementPayload & { id: string })) => {
    if ('id' in payload && payload.id) {
      updateMutation.mutate(payload as UpdatePlacementPayload & { id: string }, { onSuccess: () => setModalOpen(false) });
    } else {
      createMutation.mutate(payload as CreatePlacementPayload, { onSuccess: () => setModalOpen(false) });
    }
  };

  const previewTournament = tournaments.find(t => t.id === previewTournamentId);

  return (
    <div className="min-h-screen bg-transparent text-white p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Sponsor Ad Manager</h1>
        <p className="text-sm text-zinc-500 mt-1">Assign sponsors to placement zones across tournaments and global pages.</p>
      </div>

      {/* View switcher */}
      <div className="flex items-center justify-between mb-6">
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
        </div>
      </div>

      {/* Active view */}
      {view === 'tournament' ? (
        <TournamentView
          tournaments={tournaments}
          onAssign={(zone, tid) => openAssignModal(zone, tid)}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onPreview={setPreviewTournamentId}
        />
      ) : (
        <SponsorView
          sponsors={sponsors}
          onAssign={() => openAssignModal(undefined, undefined)}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      )}

      {/* Assignment / Edit Modal */}
      <PlacementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
        sponsors={sponsors}
        editing={editing}
        defaultZone={modalDefaults.zone}
        defaultTournamentId={modalDefaults.tournamentId}
      />

      {/* Preview Modal */}
      <PlacementPreview
        open={!!previewTournamentId}
        onClose={() => setPreviewTournamentId(null)}
        placements={previewPlacements}
        tournamentName={previewTournament?.name ?? 'Tournament'}
      />
    </div>
  );
}
