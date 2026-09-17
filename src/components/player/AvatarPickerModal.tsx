import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { useQuery } from '@tanstack/react-query';
import { Shuffle, Upload, Loader2, Check, ImageIcon, Lock } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { getCroppedImg } from '@/lib/imageUtils';
import { AVATAR_COMPRESS_PRESET, compressImageForUpload } from '@/utils/compressImage';
import {
    AVATAR_STYLES,
    DEFAULT_STYLE,
    type AvatarStyleId,
    type DiceBearResult,
    type PhotoResult,
    type AvatarPickerSelection,
} from './avatarStyles';

// ── Helpers ───────────────────────────────────────────────────────────────────

function dicebearUrl(style: string, seed: string) {
    return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

function randomSeed() {
    return Math.random().toString(36).slice(2, 9);
}

function generateGridSeeds(base: string): string[] {
    return [base, `${base}-2`, `${base}-3`, `${base}-4`, `${base}-5`, `${base}-6`, `${base}-7`, `${base}-8`];
}

interface AvatarPickerModalProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    username: string;
    currentSeed: string | null;
    currentStyle: AvatarStyleId | null;
    onSelect: (result: AvatarPickerSelection) => void;
}

// ── DiceBear tab ──────────────────────────────────────────────────────────────

function DiceBearPicker({ userId, username, currentSeed, currentStyle, onSelect }: {
    userId: string;
    username: string;
    currentSeed: string | null;
    currentStyle: AvatarStyleId | null;
    onSelect: (result: DiceBearResult) => void;
}) {
    const { toast } = useToast();
    const initialBase = currentSeed || username || userId;
    const [style, setStyle]               = useState<AvatarStyleId>(currentStyle ?? DEFAULT_STYLE);
    const [gridSeeds, setGridSeeds]       = useState(() => generateGridSeeds(initialBase));
    const [selectedSeed, setSelectedSeed] = useState(initialBase);
    const [customInput, setCustomInput]   = useState(currentSeed || '');

    const { data: claimedSet = new Set<string>() } = useQuery({
        queryKey: ['avatar-availability', style, gridSeeds],
        queryFn: async () => {
            const params = new URLSearchParams({ style });
            gridSeeds.forEach(s => params.append('seeds', s));
            const data = await apiClient.get<{ claimed: string[] }>(`/api/avatars/availability?${params}`);
            return new Set(data.claimed);
        },
        staleTime: 10_000,
    });

    const handleCustomInput = (val: string) => {
        setCustomInput(val);
        if (val.trim()) setSelectedSeed(val.trim());
    };

    const handleShuffle = () => {
        const next = Array.from({ length: 8 }, () => randomSeed());
        setGridSeeds(next);
        setSelectedSeed(next[0]);
        setCustomInput('');
    };

    const handleGridPick = (seed: string) => {
        if (claimedSet.has(seed)) return;
        setSelectedSeed(seed);
        setCustomInput(seed);
    };

    const handleUse = () => {
        if (claimedSet.has(selectedSeed)) {
            toast({ title: 'Already claimed', description: 'This avatar belongs to another user. Try a different seed.', variant: 'destructive' });
            return;
        }
        onSelect({ type: 'dicebear', style, seed: selectedSeed, avatarUrl: dicebearUrl(style, selectedSeed) });
    };

    const selectedIsClaimed = claimedSet.has(selectedSeed);

    return (
        <div className="space-y-6">
            {/* ── Preview hero ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-5 px-1">
                {/* Avatar with conditional glow */}
                <div className="relative shrink-0">
                    <div className={cn(
                        'w-[88px] h-[88px] rounded-full overflow-hidden transition-all duration-300',
                        selectedIsClaimed
                            ? 'ring-2 ring-zinc-700 opacity-50'
                            : 'ring-2 ring-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.35)]'
                    )}>
                        <img
                            src={dicebearUrl(style, selectedSeed)}
                            alt="Selected avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    {selectedIsClaimed && (
                        <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40">
                            <Lock className="w-5 h-5 text-zinc-400" />
                        </div>
                    )}
                </div>

                {/* Identity text */}
                <div className="min-w-0">
                    <p className="text-[11px] text-zinc-500 mb-1">Your identity</p>
                    <p className="text-white font-semibold text-sm truncate">
                        {selectedSeed || username}
                    </p>
                    <div className="mt-1.5">
                        {selectedIsClaimed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2 py-0.5">
                                <Lock className="w-2.5 h-2.5" /> Claimed by another user
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Style selector ───────────────────────────────────────────── */}
            <div className="space-y-2">
                <p className="text-[11px] font-medium text-zinc-400 px-1">Style</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {AVATAR_STYLES.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setStyle(id)}
                            className={cn(
                                'shrink-0 flex flex-col items-center gap-1 transition-all',
                            )}
                        >
                            <div className={cn(
                                'w-11 h-11 rounded-full overflow-hidden transition-all duration-200',
                                style === id
                                    ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-[#0f0f11] shadow-[0_0_10px_rgba(225,29,72,0.3)]'
                                    : 'ring-1 ring-zinc-800 opacity-60 hover:opacity-100 hover:ring-zinc-600'
                            )}>
                                <img src={dicebearUrl(id, selectedSeed)} alt={label} className="w-full h-full object-cover" />
                            </div>
                            <span className={cn(
                                'text-[9px] leading-tight',
                                style === id ? 'text-rose-400 font-medium' : 'text-zinc-600'
                            )}>
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Seed input ───────────────────────────────────────────────── */}
            <div className="space-y-1.5 px-1">
                <p className="text-[11px] font-medium text-zinc-400">Seed — any text gives you a unique look</p>
                <div className="flex gap-2">
                    <Input
                        value={customInput}
                        onChange={(e) => handleCustomInput(e.target.value)}
                        placeholder={`Try "${username}" or anything you like`}
                        className="bg-zinc-900/60 border-zinc-800 focus:border-rose-500/60 text-sm h-9 placeholder:text-zinc-600"
                    />
                    <button
                        type="button"
                        onClick={handleShuffle}
                        title="Shuffle"
                        className="shrink-0 w-9 h-9 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-zinc-700 transition-colors flex items-center justify-center text-zinc-400 hover:text-white"
                    >
                        <Shuffle className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ── Variations grid (circular) ───────────────────────────────── */}
            <div className="space-y-2 px-1">
                <p className="text-[11px] font-medium text-zinc-400">Variations</p>
                <div className="grid grid-cols-4 gap-3">
                    {gridSeeds.map((seed) => {
                        const isClaimed = claimedSet.has(seed);
                        const isSelected = selectedSeed === seed;
                        return (
                            <button
                                key={seed}
                                type="button"
                                onClick={() => handleGridPick(seed)}
                                disabled={isClaimed}
                                className={cn(
                                    'relative aspect-square rounded-full overflow-hidden transition-all duration-200',
                                    isClaimed
                                        ? 'opacity-35 cursor-not-allowed grayscale'
                                        : isSelected
                                            ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-[#0f0f11] shadow-[0_0_12px_rgba(225,29,72,0.4)] scale-105'
                                            : 'ring-1 ring-zinc-800 hover:ring-zinc-600 hover:scale-105'
                                )}
                            >
                                <img src={dicebearUrl(style, seed)} alt="" className="w-full h-full object-cover" />
                                {isSelected && !isClaimed && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center shadow-sm">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                    </div>
                                )}
                                {isClaimed && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Lock className="w-3 h-3 text-zinc-500" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <div className="px-1 pt-1">
                <Button
                    onClick={handleUse}
                    disabled={selectedIsClaimed}
                    className="w-full bg-rose-600 hover:bg-rose-700 text-white h-10 font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    {selectedIsClaimed
                        ? <><Lock className="w-4 h-4 mr-2" />Already claimed</>
                        : 'Claim this avatar'
                    }
                </Button>
                {!selectedIsClaimed && (
                    <p className="text-center text-[10px] text-zinc-600 mt-2">Yours forever once claimed</p>
                )}
            </div>
        </div>
    );
}

// ── Photo upload + crop tab ───────────────────────────────────────────────────

function PhotoPicker({ userId, onSelect }: {
    userId: string;
    onSelect: (result: PhotoResult) => void;
}) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageSrc, setImageSrc]                   = useState<string | null>(null);
    const [crop, setCrop]                            = useState({ x: 0, y: 0 });
    const [zoom, setZoom]                            = useState(1);
    const [brightness, setBrightness]               = useState(100);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isUploading, setIsUploading]             = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            toast({ title: 'Invalid file', description: 'Only PNG and JPEG are supported.', variant: 'destructive' });
            return;
        }
        if (file.size > 1 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Max size is 1MB.', variant: 'destructive' });
            return;
        }
        setImageSrc(URL.createObjectURL(file));
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setBrightness(100);
    };

    const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

    const handleUpload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsUploading(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, brightness);
            if (!blob) throw new Error('Crop failed');
            const raw = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            const compressed = await compressImageForUpload(raw, AVATAR_COMPRESS_PRESET);
            const fd = new FormData();
            fd.append('file', compressed);
            fd.append('bucket', 'users.avatars');
            fd.append('folder', `avatars/${userId}`);
            const { url } = await apiClient.upload<{ url: string }>('/api/storage/upload', fd);
            onSelect({ type: 'photo', avatarUrl: url });
        } catch (err: any) {
            toast({ title: 'Upload failed', description: err.message || 'Something went wrong.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    const reset = () => { setImageSrc(null); if (fileInputRef.current) fileInputRef.current.value = ''; };

    if (!imageSrc) {
        return (
            <div>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-52 rounded-2xl border border-dashed border-zinc-800 hover:border-rose-500/40 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all flex flex-col items-center justify-center gap-3"
                >
                    <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-zinc-500" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-zinc-300">Upload your photo</p>
                        <p className="text-xs text-zinc-600 mt-0.5">PNG or JPEG — up to 1MB</p>
                    </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileSelect} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Crop area */}
            <div className="relative h-64 rounded-2xl overflow-hidden bg-zinc-950">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    style={{
                        containerStyle: { borderRadius: '1rem' },
                        mediaStyle: { filter: `brightness(${brightness}%)` },
                    }}
                />
            </div>

            {/* Sliders */}
            <div className="space-y-3 px-1">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-500 w-20 shrink-0">Zoom</span>
                    <Slider min={1} max={3} step={0.05} value={[zoom]} onValueChange={([v]) => setZoom(v)}
                        className="flex-1 [&_[role=slider]]:bg-rose-500" />
                    <span className="text-[11px] text-zinc-500 w-8 text-right">{zoom.toFixed(1)}×</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[11px] text-zinc-500 w-20 shrink-0">Brightness</span>
                    <Slider min={60} max={140} step={1} value={[brightness]} onValueChange={([v]) => setBrightness(v)}
                        className="flex-1 [&_[role=slider]]:bg-rose-500" />
                    <span className="text-[11px] text-zinc-500 w-8 text-right">{brightness}%</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-1">
                <button
                    type="button"
                    onClick={reset}
                    className="h-10 px-4 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 transition-colors text-sm text-zinc-300"
                >
                    Change
                </button>
                <Button onClick={handleUpload} disabled={isUploading}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white h-10 font-semibold">
                    {isUploading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                        : <><Upload className="w-4 h-4 mr-2" />Save photo</>}
                </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileSelect} />
        </div>
    );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
    open, onClose, userId, username, currentSeed, currentStyle, onSelect,
}) => {
    const [tab, setTab] = useState<'avatar' | 'photo'>('avatar');
    const handleSelect = (result: AvatarPickerSelection) => { onSelect(result); onClose(); };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent
                className="max-w-[420px] w-full bg-[#0f0f11] border-zinc-800/80 text-white p-0 overflow-hidden max-h-[92vh] flex flex-col"
                data-lenis-prevent
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-0 shrink-0">
                    <h2 className="text-base font-semibold text-white">Choose your identity</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Pick a generated avatar or upload your own photo</p>

                    {/* Tab switcher */}
                    <div className="flex mt-4 bg-zinc-900/60 rounded-lg p-0.5 border border-zinc-800/60">
                        {(['avatar', 'photo'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={cn(
                                    'flex-1 h-8 rounded-md text-xs font-medium transition-all',
                                    tab === t
                                        ? 'bg-zinc-800 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                )}
                            >
                                {t === 'avatar' ? 'Generate avatar' : 'Upload photo'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tab === 'avatar' ? (
                        <DiceBearPicker
                            userId={userId}
                            username={username}
                            currentSeed={currentSeed}
                            currentStyle={currentStyle}
                            onSelect={handleSelect}
                        />
                    ) : (
                        <PhotoPicker userId={userId} onSelect={handleSelect} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AvatarPickerModal;
