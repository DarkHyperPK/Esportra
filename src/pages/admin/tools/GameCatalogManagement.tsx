import { useRef, useState } from 'react';
import { Upload, Trash2, RefreshCw, Rocket, XCircle, Loader2 } from 'lucide-react';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { AdminPage } from '@/components/admin/AdminPage';
import {
  CommandButton,
  CommandSection,
  CommandTabs,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import {
  useAdminGameCatalogDraft,
  useAdminGameCatalogVersions,
  useDiscardGameCatalogDraft,
  usePublishGameCatalog,
  useResetGameCatalogDraft,
  useUploadDraftGameLogo,
} from '@/hooks/useGameCatalogAdmin';
import type { CatalogGameApi } from '@/types/gameCatalog';
import MapManagement from './MapManagement';

function GameRow({
  game,
  onUploadLogo,
  isUploading,
}: {
  game: CatalogGameApi;
  onUploadLogo: (slug: string, file: File) => void;
  isUploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4 border border-white/10 bg-white/[0.025] p-4">
      <GameLogoImage
        gameName={game.name}
        catalogLogo={game.logo}
        alt={game.name}
        className="h-12 w-12 border border-white/10 bg-[#0a0a0c] object-contain"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-white">{game.name}</h3>
          <span className="border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {game.slug}
          </span>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {game.gameType} · {game.modes.length} mode(s) · {game.tournamentStructures.length} structure(s)
        </p>
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUploadLogo(game.slug, file);
            e.target.value = '';
          }}
        />
        <CommandButton
          variant="ghost"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Logo
        </CommandButton>
      </div>
    </div>
  );
}

function CatalogTab() {
  const { data: draft, isLoading, error, refetch } = useAdminGameCatalogDraft();
  const { data: versions } = useAdminGameCatalogVersions();
  const resetDraft = useResetGameCatalogDraft();
  const publish = usePublishGameCatalog();
  const discard = useDiscardGameCatalogDraft();
  const uploadLogo = useUploadDraftGameLogo();
  const [notes, setNotes] = useState('');
  const [uploadingSlug, setUploadingSlug] = useState<string | null>(null);

  const handlePublish = async () => {
    try {
      await publish.mutateAsync(notes.trim() || undefined);
      toast({ title: 'Catalog published', description: 'The draft is now the active catalog.' });
      setNotes('');
    } catch (err) {
      toast({
        title: 'Publish failed',
        description: err instanceof Error ? err.message : 'Could not publish catalog draft.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = async () => {
    try {
      await resetDraft.mutateAsync();
      toast({ title: 'Draft reset', description: 'Draft recreated from the active catalog.' });
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'Could not reset draft.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = async () => {
    try {
      await discard.mutateAsync();
      toast({ title: 'Draft discarded' });
      refetch();
    } catch (err) {
      toast({
        title: 'Discard failed',
        description: err instanceof Error ? err.message : 'Could not discard draft.',
        variant: 'destructive',
      });
    }
  };

  const handleUploadLogo = async (slug: string, file: File) => {
    setUploadingSlug(slug);
    try {
      const result = await uploadLogo.mutateAsync({ slug, file });
      toast({ title: 'Logo uploaded', description: result.logoUrl });
    } catch (err) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Could not upload logo.',
        variant: 'destructive',
      });
    } finally {
      setUploadingSlug(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading catalog draft...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
        Failed to load catalog draft: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CommandToolbar>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Draft: {draft?.catalogVersion} · {draft?.games.length ?? 0} games
        </span>
        <div className="flex flex-wrap gap-2">
          <CommandButton variant="secondary" size="sm" onClick={handleReset} disabled={resetDraft.isPending}>
            <RefreshCw className="h-4 w-4" /> Reset draft
          </CommandButton>
          <CommandButton variant="danger" size="sm" onClick={handleDiscard} disabled={discard.isPending}>
            <XCircle className="h-4 w-4" /> Discard
          </CommandButton>
          <CommandButton variant="primary" size="sm" onClick={handlePublish} disabled={publish.isPending}>
            <Rocket className="h-4 w-4" /> Publish
          </CommandButton>
        </div>
      </CommandToolbar>

      <Input
        placeholder="Publish notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="max-w-md rounded-none border-white/10 bg-[#0a0a0c]"
      />

      <div className="space-y-3">
        {(draft?.games ?? []).map((game) => (
          <GameRow
            key={game.slug}
            game={game}
            onUploadLogo={handleUploadLogo}
            isUploading={uploadingSlug === game.slug}
          />
        ))}
      </div>

      <CommandSection>
        <h2 className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">
          Version history
        </h2>
        <div className="divide-y divide-white/5">
          {(versions ?? []).map((version) => (
            <div key={version.id} className="flex items-center justify-between py-2 text-sm text-zinc-300">
              <span>{version.catalogVersion}</span>
              <div className="flex items-center gap-2">
                <span className="border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {version.status}
                </span>
                <span className="border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {version.source}
                </span>
                {version.isActive && (
                  <span className="border border-rose-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-rose-300">
                    active
                  </span>
                )}
              </div>
            </div>
          ))}
          {!versions?.length && <p className="py-2 text-sm text-zinc-500">No versions loaded.</p>}
        </div>
      </CommandSection>

      <p className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
        <Trash2 className="h-3 w-3" />
        Full game editing UI can extend this page; publish validates modes, structures, and BR config server-side.
      </p>
    </div>
  );
}

export default function GameCatalogManagement() {
  const [activeTab, setActiveTab] = useState('catalog');

  return (
    <AdminPage eyebrow="Content" title="Game Catalog">
      <CommandTabs
        tabs={[
          { value: 'catalog', label: 'Game Catalog' },
          { value: 'maps', label: 'Maps' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'catalog' ? (
        <CatalogTab />
      ) : (
        <MapManagement embedded />
      )}
    </AdminPage>
  );
}
