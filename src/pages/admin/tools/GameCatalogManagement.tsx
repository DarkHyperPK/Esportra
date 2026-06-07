import React, { useRef, useState } from 'react';
import { Gamepad2, Upload, Trash2, RefreshCw, Rocket, XCircle, Loader2 } from 'lucide-react';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import {
  useAdminGameCatalogDraft,
  useAdminGameCatalogVersions,
  useDiscardGameCatalogDraft,
  usePublishGameCatalog,
  useResetGameCatalogDraft,
  useUploadDraftGameLogo,
} from '@/hooks/useGameCatalogAdmin';
import type { CatalogGameApi } from '@/types/gameCatalog';

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
    <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800 bg-[#0a0a0c]">
      <GameLogoImage
        gameName={game.name}
        catalogLogo={game.logo}
        alt={game.name}
        className="w-12 h-12 rounded-lg object-contain bg-zinc-900"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white truncate">{game.name}</h3>
          <Badge variant="outline" className="text-xs">{game.slug}</Badge>
        </div>
        <p className="text-sm text-zinc-400">
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
        <Button
          size="sm"
          variant="outline"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="ml-2">Logo</span>
        </Button>
      </div>
    </div>
  );
}

export default function GameCatalogManagement() {
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
      <div className="flex items-center justify-center min-h-[40vh] text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading catalog draft...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-red-400">
        Failed to load catalog draft: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-rose-500" />
            Game Catalog
          </h1>
          <p className="text-zinc-400 mt-1">
            Draft: {draft?.catalogVersion} · {draft?.games.length ?? 0} games
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleReset} disabled={resetDraft.isPending}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reset draft
          </Button>
          <Button variant="outline" onClick={handleDiscard} disabled={discard.isPending}>
            <XCircle className="w-4 h-4 mr-2" /> Discard
          </Button>
          <Button onClick={handlePublish} disabled={publish.isPending}>
            <Rocket className="w-4 h-4 mr-2" /> Publish
          </Button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Publish notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="max-w-md"
        />
      </div>

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

      <div className="rounded-xl border border-zinc-800 p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Version history</h2>
        <div className="space-y-2">
          {(versions ?? []).map((version) => (
            <div key={version.id} className="flex items-center justify-between text-sm text-zinc-300">
              <span>{version.catalogVersion}</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{version.status}</Badge>
                <Badge variant="outline">{version.source}</Badge>
                {version.isActive && <Badge className="bg-emerald-600">active</Badge>}
              </div>
            </div>
          ))}
          {!versions?.length && <p className="text-zinc-500 text-sm">No versions loaded.</p>}
        </div>
      </div>

      <p className="text-xs text-zinc-500 flex items-center gap-1">
        <Trash2 className="w-3 h-3" />
        Full game editing UI can extend this page; publish validates modes, structures, and BR config server-side.
      </p>
    </div>
  );
}
