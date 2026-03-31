import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Check, Image, Film, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IgdbVideo {
  videoId: string;
  name: string | null;
}

interface IgdbAssets {
  banners: string[];
  cover: string | null;
  videos: IgdbVideo[];
}

interface ArtworkPickerProps {
  gameName: string;
  onSelect: (url: string) => void;
  selectedUrl?: string | null;
}

const ArtworkPicker: React.FC<ArtworkPickerProps> = ({ gameName, onSelect, selectedUrl }) => {
  const [assets, setAssets] = useState<IgdbAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'images' | 'videos'>('images');

  useEffect(() => {
    if (!gameName) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<IgdbAssets>(`/api/games/igdb-assets?game=${encodeURIComponent(gameName)}`)
      .then(data => {
        if (!cancelled) {
          setAssets(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load artwork');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [gameName]);

  const allImages = assets
    ? [...assets.banners, ...(assets.cover ? [assets.cover] : [])]
    : [];

  const hasVideos = (assets?.videos?.length ?? 0) > 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">Loading artwork for {gameName}…</p>
      </div>
    );
  }

  if (error || allImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-2">
        <Image className="w-8 h-8" />
        <p className="text-sm">{error || `No artwork available for ${gameName}`}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      {hasVideos && (
        <div className="flex gap-2">
          <button
            onClick={() => setTab('images')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === 'images'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
            )}
          >
            <Image className="w-3.5 h-3.5" />
            Images ({allImages.length})
          </button>
          <button
            onClick={() => setTab('videos')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === 'videos'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
            )}
          >
            <Film className="w-3.5 h-3.5" />
            Videos ({assets?.videos.length})
          </button>
        </div>
      )}

      {/* Image grid */}
      {tab === 'images' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {allImages.map((url, i) => {
            const isSelected = selectedUrl === url;
            return (
              <button
                key={url}
                onClick={() => onSelect(url)}
                className={cn(
                  'relative group rounded-xl overflow-hidden border-2 transition-all aspect-video',
                  isSelected
                    ? 'border-rose-500 ring-2 ring-rose-500/30 scale-[1.02]'
                    : 'border-white/5 hover:border-white/20'
                )}
              >
                <img
                  src={url}
                  alt={`${gameName} artwork ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className={cn(
                  'absolute inset-0 flex items-center justify-center transition-opacity',
                  isSelected ? 'bg-rose-500/20' : 'bg-black/0 group-hover:bg-black/40'
                )}>
                  {isSelected && (
                    <div className="bg-rose-500 rounded-full p-1.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Video grid */}
      {tab === 'videos' && assets?.videos && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {assets.videos.map((video) => {
            const thumbUrl = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
            const isSelected = selectedUrl === thumbUrl;
            return (
              <button
                key={video.videoId}
                onClick={() => onSelect(thumbUrl)}
                className={cn(
                  'relative group rounded-xl overflow-hidden border-2 transition-all aspect-video',
                  isSelected
                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                    : 'border-white/5 hover:border-white/20'
                )}
              >
                <img
                  src={thumbUrl}
                  alt={video.name || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  {isSelected ? (
                    <div className="bg-rose-500 rounded-full p-1.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="bg-black/60 rounded-full p-2 group-hover:bg-black/80 transition-colors">
                      <Film className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                {video.name && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                    <p className="text-xs text-white truncate">{video.name}</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Artwork provided by IGDB via Esportra Partners
      </p>
    </div>
  );
};

export default ArtworkPicker;
