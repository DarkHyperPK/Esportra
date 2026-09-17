import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2, Check, ImageIcon, Lock, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CtaButton } from '@/components/ui/app-buttons';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { getCroppedImg } from '@/lib/imageUtils';
import { AVATAR_COMPRESS_PRESET, compressImageForUpload } from '@/utils/compressImage';
import {
    type AvatarStyleId,
    type PhotoResult,
    type AvatarPickerSelection,
} from './avatarStyles';

// ── Helpers ───────────────────────────────────────────────────────────────────

function dicebearUrl(style: string, seed: string) {
    return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

interface AvatarPickerModalProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    username: string;
    currentSeed: string | null;
    currentStyle: AvatarStyleId | null;
    currentPhotoUrl: string | null;
    onSelect: (result: AvatarPickerSelection) => void;
}

interface PoolItem {
    id: string;
    style: string;
    seed: string;
    claimed_by: string | null;
    claimed_at: string | null;
}

// ── Pool browser tab ──────────────────────────────────────────────────────────

function AvatarPoolPicker({ onSelect, currentSeed }: {
    onSelect: (result: AvatarPickerSelection) => void;
    currentSeed: string | null;
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState<'all' | 'owned'>('all');
    const [page, setPage] = useState(0);
    const [selectedItem, setSelectedItem] = useState<PoolItem | null>(null);
    const [confirmingRelease, setConfirmingRelease] = useState(false);
    const PAGE_SIZE = 16;

    // Load user's current owned avatar + release info
    const { data: mineData } = useQuery({
        queryKey: ['avatar-mine'],
        queryFn: () => apiClient.get<{
            owned: PoolItem | null;
            releases_used: number;
            releases_remaining: number;
        }>('/api/avatars/mine'),
    });
    const owned = mineData?.owned ?? null;
    const releasesRemaining = mineData?.releases_remaining ?? 2;
    const canRelease = releasesRemaining > 0;

    // Browse available pool items (only fetched in All view)
    const { data: poolData, isLoading } = useQuery({
        queryKey: ['avatar-pool', page],
        queryFn: () => {
            const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
            return apiClient.get<{ items: PoolItem[]; total: number }>(`/api/avatars/pool?${params}`);
        },
        enabled: filter === 'all',
    });
    const items = poolData?.items ?? [];
    const total = poolData?.total ?? 0;
    const hasMore = (page + 1) * PAGE_SIZE < total;

    // Claim mutation
    const claimMutation = useMutation({
        mutationFn: (itemId: string) => apiClient.post('/api/avatars/claim', { itemId }),
        onSuccess: (_data, itemId) => {
            const item = selectedItem ?? items.find(i => i.id === itemId);
            if (item) {
                onSelect({ type: 'dicebear', style: item.style as AvatarStyleId, seed: item.seed, avatarUrl: dicebearUrl(item.style, item.seed) });
            }
            queryClient.invalidateQueries({ queryKey: ['avatar-mine'] });
            queryClient.invalidateQueries({ queryKey: ['avatar-pool'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
        onError: (err: any) => {
            toast({ title: 'Could not claim', description: err?.body?.error ?? 'Something went wrong.', variant: 'destructive' });
        },
    });

    // Release mutation
    const releaseMutation = useMutation({
        mutationFn: () => apiClient.delete('/api/avatars/claim'),
        onSuccess: () => {
            setConfirmingRelease(false);
            toast({ title: 'Avatar released', description: `${releasesRemaining - 1} release${releasesRemaining - 1 === 1 ? '' : 's'} remaining.` });
            queryClient.invalidateQueries({ queryKey: ['avatar-mine'] });
            queryClient.invalidateQueries({ queryKey: ['avatar-pool'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
        onError: (err: any) => {
            setConfirmingRelease(false);
            toast({ title: 'Could not release', description: err?.body?.error ?? 'Something went wrong.', variant: 'destructive' });
        },
    });

    const handleClaim = () => {
        if (!selectedItem) return;
        claimMutation.mutate(selectedItem.id);
    };

    const handleApplyOwned = (item: PoolItem) => {
        onSelect({ type: 'dicebear', style: item.style as AvatarStyleId, seed: item.seed, avatarUrl: dicebearUrl(item.style, item.seed) });
    };

    const handleFilterChange = (f: 'all' | 'owned') => {
        setFilter(f);
        setPage(0);
        setSelectedItem(null);
    };

    const isOwnedItem = (item: PoolItem) => owned?.id === item.id;
    const isMine = !!owned;
    const ownedIsActive = owned !== null && owned.seed === currentSeed;


    return (
        <div className="space-y-5">
            {/* All / Owned filter */}
            <div className="flex bg-zinc-900/60 rounded-lg p-0.5 border border-zinc-800/60">
                {(['all', 'owned'] as const).map((f) => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => handleFilterChange(f)}
                        className={cn(
                            'flex-1 h-7 rounded-md text-[11px] font-medium transition-all',
                            filter === f ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                        )}
                    >
                        {f === 'all' ? 'All avatars' : 'Owned'}
                    </button>
                ))}
            </div>

            {/* Owned avatar banner (visible in All view) */}
            {filter === 'all' && owned && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-rose-500/50 shrink-0">
                            <img src={dicebearUrl(owned.style, owned.seed)} alt="Your avatar" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-zinc-400">Your avatar</p>
                            <p className="text-sm font-medium text-white truncate">{owned.seed}</p>
                            <p className="text-[10px] text-zinc-500 capitalize">{owned.style}</p>
                        </div>
                        {!confirmingRelease && !ownedIsActive && (
                            <button
                                type="button"
                                onClick={() => handleApplyOwned(owned)}
                                className="shrink-0 text-[10px] font-semibold flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors"
                            >
                                <Check className="w-3 h-3" />
                                Apply
                            </button>
                        )}
                        {!confirmingRelease && ownedIsActive && (
                            <span className="shrink-0 text-[10px] font-medium text-emerald-500 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Active
                            </span>
                        )}
                        {!confirmingRelease && (
                            <button
                                type="button"
                                onClick={() => canRelease && setConfirmingRelease(true)}
                                disabled={!canRelease}
                                className={cn(
                                    'shrink-0 text-[10px] font-medium flex items-center gap-1 transition-colors ml-1',
                                    canRelease ? 'text-zinc-600 hover:text-red-400' : 'text-zinc-800 cursor-not-allowed',
                                )}
                            >
                                <RefreshCw className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Inline release confirmation */}
                    {confirmingRelease && (
                        <div className="border-t border-rose-500/20 bg-rose-500/[0.06] px-3 py-2.5 flex items-center justify-between gap-3">
                            <p className="text-[11px] text-zinc-300 leading-snug">
                                Release this avatar? You'll have{' '}
                                <span className="text-white font-semibold">{releasesRemaining - 1}</span>{' '}
                                release{releasesRemaining - 1 === 1 ? '' : 's'} left after this.
                            </p>
                            <div className="flex items-center gap-2 shrink-0">
                                <button type="button" onClick={() => setConfirmingRelease(false)}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors font-medium px-2">
                                    Cancel
                                </button>
                                <button type="button" onClick={() => releaseMutation.mutate()}
                                    disabled={releaseMutation.isPending}
                                    className="flex items-center gap-1 text-[11px] text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded font-medium transition-colors disabled:opacity-50">
                                    {releaseMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    Yes, release
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Release counter */}
                    {!confirmingRelease && (
                        <div className="border-t border-rose-500/10 px-3 py-1.5">
                            <p className="text-[10px] text-zinc-600">
                                {releasesRemaining > 0
                                    ? <><span className="text-zinc-400">{releasesRemaining}</span> release{releasesRemaining === 1 ? '' : 's'} remaining</>
                                    : <span className="text-zinc-700">No releases remaining — this avatar is permanent</span>
                                }
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Notice (All view only) */}
            {filter === 'all' && (
                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-rose-500 inline-block shrink-0" />
                    One avatar per account — yours forever once claimed
                </p>
            )}

            {/* Owned filter view */}
            {filter === 'owned' && (
                owned ? (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                            <div className="flex items-center gap-4 p-4">
                                <div className={cn(
                                    'w-16 h-16 rounded-full overflow-hidden ring-2 shrink-0',
                                    ownedIsActive ? 'ring-emerald-500' : 'ring-zinc-700'
                                )}>
                                    <img src={dicebearUrl(owned.style, owned.seed)} alt={owned.seed} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{owned.seed}</p>
                                    <p className="text-xs text-zinc-500 capitalize mt-0.5">{owned.style}</p>
                                    {ownedIsActive && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium mt-1">
                                            <Check className="w-3 h-3" />
                                            Currently active
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="border-t border-zinc-800/60 px-4 py-3 flex items-center justify-between gap-3">
                                {!ownedIsActive ? (
                                    <CtaButton
                                        onClick={() => handleApplyOwned(owned)}
                                        className="flex-1 h-9 font-semibold text-sm"
                                    >
                                        <Check className="w-4 h-4 mr-1.5" />
                                        Apply this avatar
                                    </CtaButton>
                                ) : (
                                    <span className="text-xs text-zinc-500">This avatar is your active identity</span>
                                )}
                                {!confirmingRelease && (
                                    <button
                                        type="button"
                                        onClick={() => canRelease && setConfirmingRelease(true)}
                                        disabled={!canRelease}
                                        className={cn(
                                            'text-[11px] font-medium flex items-center gap-1 transition-colors shrink-0',
                                            canRelease ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-700 cursor-not-allowed',
                                        )}
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        {canRelease ? 'Release' : 'No releases left'}
                                    </button>
                                )}
                            </div>
                            {confirmingRelease && (
                                <div className="border-t border-zinc-800/60 px-4 py-3 flex items-center justify-between gap-3">
                                    <p className="text-[11px] text-zinc-300 leading-snug">
                                        Release this avatar? {releasesRemaining - 1} release{releasesRemaining - 1 === 1 ? '' : 's'} left after this.
                                    </p>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button type="button" onClick={() => setConfirmingRelease(false)}
                                            className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium px-2">
                                            Cancel
                                        </button>
                                        <button type="button" onClick={() => releaseMutation.mutate()}
                                            disabled={releaseMutation.isPending}
                                            className="flex items-center gap-1 text-[11px] text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded font-medium disabled:opacity-50">
                                            {releaseMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                            Yes, release
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="border-t border-zinc-800/40 px-4 py-2">
                                <p className="text-[10px] text-zinc-600">
                                    {releasesRemaining > 0
                                        ? <><span className="text-zinc-400">{releasesRemaining}</span> release{releasesRemaining === 1 ? '' : 's'} remaining</>
                                        : <span className="text-zinc-700">No releases remaining — this avatar is permanent</span>
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-300">No avatar claimed yet</p>
                            <p className="text-xs text-zinc-600 mt-0.5">Browse all avatars to claim yours</p>
                        </div>
                        <button type="button" onClick={() => handleFilterChange('all')}
                            className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-medium">
                            Browse pool
                        </button>
                    </div>
                )
            )}

            {/* All filter: Pool grid */}
            {filter === 'all' && (isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-300">No avatars available</p>
                        <p className="text-xs text-zinc-600 mt-0.5">Check back when the next drop goes live</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-3">
                    {items.map((item) => {
                        const mine = isOwnedItem(item);
                        const takenByOther = item.claimed_by && !mine;
                        const isSelected = selectedItem?.id === item.id;

                        return (
                            <button
                                key={item.id}
                                type="button"
                                disabled={!!takenByOther}
                                onClick={() => !takenByOther && setSelectedItem(isSelected ? null : item)}
                                className={cn(
                                    'relative aspect-square rounded-full overflow-hidden transition-all duration-200',
                                    takenByOther
                                        ? 'opacity-25 cursor-not-allowed grayscale'
                                        : mine
                                            ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0f0f11]'
                                            : isSelected
                                                ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-[#0f0f11] shadow-[0_0_14px_rgba(225,29,72,0.4)] scale-105'
                                                : 'ring-1 ring-zinc-800 hover:ring-zinc-600 hover:scale-105'
                                )}
                            >
                                <img
                                    src={dicebearUrl(item.style, item.seed)}
                                    alt={item.seed}
                                    className="w-full h-full object-cover"
                                />
                                {isSelected && !mine && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                    </div>
                                )}
                                {mine && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                        </div>
                                    </div>
                                )}
                                {takenByOther && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Lock className="w-3 h-3 text-zinc-500" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            ))}

            {/* Load more */}
            {hasMore && (
                <button
                    type="button"
                    onClick={() => setPage(p => p + 1)}
                    className="w-full h-8 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                >
                    Load more
                </button>
            )}

            {/* Selected preview + CTA (All view only) */}
            {filter === 'all' && selectedItem && (() => {
                const isOwned = isOwnedItem(selectedItem);
                const ownedAndActive = isOwned && ownedIsActive;
                const ownedButInactive = isOwned && !ownedIsActive;
                const blockedByOther = isMine && !isOwned;
                return (
                    <div className="pt-2 border-t border-zinc-800/60 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                'w-10 h-10 rounded-full overflow-hidden ring-2 shrink-0',
                                isOwned ? 'ring-emerald-500' : 'ring-rose-500'
                            )}>
                                <img src={dicebearUrl(selectedItem.style, selectedItem.seed)} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">{selectedItem.seed}</p>
                                <p className="text-[10px] text-zinc-500 capitalize">{selectedItem.style}</p>
                            </div>
                        </div>
                        {ownedButInactive && (
                            <CtaButton
                                onClick={() => handleApplyOwned(selectedItem)}
                                className="w-full h-10 font-semibold"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Apply this avatar
                            </CtaButton>
                        )}
                        {ownedAndActive && (
                            <CtaButton disabled className="w-full h-10 font-semibold">
                                <Check className="w-4 h-4 mr-2" />
                                Already active
                            </CtaButton>
                        )}
                        {!isOwned && (
                            <CtaButton
                                onClick={handleClaim}
                                disabled={claimMutation.isPending || blockedByOther}
                                className="w-full h-10 font-semibold"
                            >
                                {claimMutation.isPending
                                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Claiming...</>
                                    : blockedByOther
                                        ? 'Release your current avatar first'
                                        : 'Claim this avatar'
                                }
                            </CtaButton>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}

// ── Photo upload + crop tab ───────────────────────────────────────────────────

function PhotoPicker({ userId, existingUrl, onSelect }: {
    userId: string;
    existingUrl: string | null;
    onSelect: (result: PhotoResult) => void;
}) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageSrc, setImageSrc]                   = useState<string | null>(existingUrl);
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

            <div className="flex gap-2 px-1">
                <button
                    type="button"
                    onClick={reset}
                    className="h-10 px-4 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 transition-colors text-sm text-zinc-300"
                >
                    Change
                </button>
                <CtaButton onClick={handleUpload} disabled={isUploading} className="flex-1 h-10 font-semibold">
                    {isUploading
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                        : <><Upload className="w-4 h-4 mr-2" />Save photo</>}
                </CtaButton>
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleFileSelect} />
        </div>
    );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
    open, onClose, userId, username: _username, currentSeed, currentStyle: _currentStyle,
    currentPhotoUrl, onSelect,
}) => {
    const [tab, setTab] = useState<'avatar' | 'photo'>('avatar');
    const handleSelect = (result: AvatarPickerSelection) => { onSelect(result); onClose(); };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent
                className="max-w-[420px] w-full bg-[#0f0f11] border-zinc-800/80 text-white p-0 overflow-hidden max-h-[92vh] flex flex-col"
                data-lenis-prevent
            >
                <div className="px-6 pt-6 pb-0 shrink-0">
                    <DialogTitle className="text-base font-semibold text-white">Choose your identity</DialogTitle>
                    <DialogDescription className="text-xs text-zinc-500 mt-0.5">Claim an avatar from the pool or upload your own photo</DialogDescription>

                    <div className="flex mt-4 bg-zinc-900/60 rounded-lg p-0.5 border border-zinc-800/60">
                        {(['avatar', 'photo'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={cn(
                                    'flex-1 h-8 rounded-md text-xs font-medium transition-all',
                                    tab === t ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                )}
                            >
                                {t === 'avatar' ? 'Avatar pool' : 'Upload photo'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tab === 'avatar'
                        ? <AvatarPoolPicker currentSeed={currentSeed} onSelect={handleSelect} />
                        : <PhotoPicker userId={userId} existingUrl={currentPhotoUrl} onSelect={handleSelect} />
                    }
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AvatarPickerModal;
