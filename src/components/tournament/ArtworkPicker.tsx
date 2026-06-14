import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { Check, Image, Film, Loader2, Sun, Crop as CropIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CtaButton } from '@/components/ui/app-buttons';
import { Slider } from '@/components/ui/slider';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '@/lib/imageUtils';

interface IgdbVideo {
  videoId: string;
  name: string | null;
}

interface IgdbAssets {
  banners: string[];
  cover: string | null;
  videos: IgdbVideo[];
  matchedGame?: string | null;
}

export interface ArtworkPickerProps {
  gameName: string;
  /** Called with the final URL (uploaded image or YouTube embed) */
  onSelect: (url: string) => void;
  selectedUrl?: string | null;
  /** Storage upload config — needed for image edit+upload */
  uploadConfig?: {
    bucket: string;
    folder: string;
  };
}

const ArtworkPicker: React.FC<ArtworkPickerProps> = ({
  gameName,
  onSelect,
  selectedUrl,
  uploadConfig = { bucket: 'system.assets.website', folder: 'partner-artwork' },
}) => {
  const [assets, setAssets] = useState<IgdbAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'images' | 'videos'>('images');

  // Image edit state
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!gameName) {
      setLoading(false);
      setError('Please select a game first');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient.get<IgdbAssets>(`/api/games/igdb-assets?game=${encodeURIComponent(gameName)}`)
      .then(data => {
        if (!cancelled) { setAssets(data); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError('Failed to load artwork'); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [gameName]);

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleEditImage = (url: string) => {
    setEditingImage(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setBrightness(100);
    setCroppedAreaPixels(null);
  };

  const handleSaveEdit = async () => {
    if (!editingImage || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(editingImage, croppedAreaPixels, brightness);
      if (!blob) throw new Error('Failed to process image');

      const file = new File([blob], `partner-artwork-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', uploadConfig.bucket);
      formData.append('folder', uploadConfig.folder);

      const result = await apiClient.upload<{ url: string; path: string }>(
        '/api/storage/upload',
        formData,
      );

      onSelect(`${result.url}?t=${Date.now()}`);
      setEditingImage(null);
    } catch (e: any) {
      console.error('Artwork save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectVideo = (videoId: string) => {
    onSelect(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0`);
  };

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

  // ── Image edit mode ──
  if (editingImage) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEditingImage(null)}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to gallery
        </button>

        <div className="relative h-64 md:h-80 w-full bg-black rounded-xl overflow-hidden">
          <Cropper
            image={editingImage}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            style={{
              containerStyle: { background: '#0a0a0c' },
              mediaStyle: { filter: `brightness(${brightness}%)` },
            }}
          />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-zinc-400">
                <CropIcon className="w-4 h-4" /> Zoom
              </span>
              <span className="text-zinc-500 font-mono">{zoom.toFixed(1)}x</span>
            </div>
            <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(v) => setZoom(v[0])} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-zinc-400">
                <Sun className="w-4 h-4 text-yellow-500" /> Brightness
              </span>
              <span className="text-zinc-500 font-mono">{brightness}%</span>
            </div>
            <Slider value={[brightness]} min={50} max={150} step={1} onValueChange={(v) => setBrightness(v[0])} />
          </div>
        </div>

        <CtaButton
          type="button"
          onClick={handleSaveEdit}
          disabled={saving}
          className="w-full"
        >
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : 'APPLY & USE ARTWORK'}
        </CtaButton>
      </div>
    );
  }

  // ── Gallery mode ──
  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      {hasVideos && (
        <div className="flex gap-2">
          <button
            type="button"
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
            type="button"
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

      {/* Image grid — click opens editor */}
      {tab === 'images' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {allImages.map((url, i) => (
            <button
              type="button"
              key={url}
              onClick={() => handleEditImage(url)}
              className="relative group rounded-xl overflow-hidden border-2 border-white/5 hover:border-rose-500/50 transition-all aspect-video"
            >
              <img
                src={url}
                alt={`${gameName} artwork ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-opacity flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white bg-rose-500/80 rounded-full px-3 py-1">
                  Edit & Use
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Video grid — playable YouTube embeds */}
      {tab === 'videos' && assets?.videos && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {assets.videos.map((video) => {
            const embedUrl = `https://www.youtube.com/embed/${video.videoId}?autoplay=0&mute=1&controls=1&modestbranding=1`;
            const isSelected = selectedUrl?.includes(video.videoId);
            return (
              <div key={video.videoId} className="space-y-2">
                <div className={cn(
                  'relative rounded-xl overflow-hidden border-2 aspect-video',
                  isSelected
                    ? 'border-rose-500 ring-2 ring-rose-500/30'
                    : 'border-white/5'
                )}>
                  <iframe
                    src={embedUrl}
                    title={video.name || 'Game video'}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-center justify-between">
                  {video.name && (
                    <p className="text-xs text-zinc-400 truncate flex-1">{video.name}</p>
                  )}
                  <button type="button"
                    type="button"
                    size="sm"
                    onClick={() => handleSelectVideo(video.videoId)}
                    className={cn(
                      'text-xs ml-2',
                      isSelected
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-white/10'
                    )}
                  >
                    {isSelected ? <><Check className="w-3 h-3 mr-1" /> Selected</> : 'Use as Banner'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Artwork from Esportra Partners{assets?.matchedGame ? ` — ${assets.matchedGame}` : ''}
      </p>
    </div>
  );
};

export default ArtworkPicker;
