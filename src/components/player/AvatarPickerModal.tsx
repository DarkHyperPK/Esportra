import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Shuffle, Upload, Loader2, Check, ImageIcon } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { getCroppedImg } from '@/lib/imageUtils';
import { AVATAR_COMPRESS_PRESET, compressImageForUpload } from '@/utils/compressImage';

const DICEBEAR_BASE = 'https://api.dicebear.com/10.x/critters/svg';

function dicebearUrl(seed: string) {
    return `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;
}

function randomSeed() {
    return Math.random().toString(36).slice(2, 9);
}

function generateGridSeeds(base: string): string[] {
    return [base, `${base}-2`, `${base}-3`, `${base}-4`, `${base}-5`, `${base}-6`, `${base}-7`, `${base}-8`];
}

interface AvatarPickerResult {
    type: 'dicebear';
    seed: string;
    avatarUrl: string;
}

interface PhotoPickerResult {
    type: 'photo';
    avatarUrl: string;
}

export type AvatarPickerSelection = AvatarPickerResult | PhotoPickerResult;

interface AvatarPickerModalProps {
    open: boolean;
    onClose: () => void;
    userId: string;
    username: string;
    currentSeed: string | null;
    onSelect: (result: AvatarPickerSelection) => void;
}

// ── DiceBear tab ──────────────────────────────────────────────────────────────

function DiceBearPicker({ userId, username, currentSeed, onSelect }: {
    userId: string;
    username: string;
    currentSeed: string | null;
    onSelect: (result: AvatarPickerResult) => void;
}) {
    const initialBase = currentSeed || username || userId;
    const [gridSeeds, setGridSeeds] = useState(() => generateGridSeeds(initialBase));
    const [selectedSeed, setSelectedSeed] = useState(currentSeed || initialBase);
    const [customInput, setCustomInput] = useState(currentSeed || '');

    const handleCustomInputChange = (val: string) => {
        setCustomInput(val);
        if (val.trim()) setSelectedSeed(val.trim());
    };

    const handleShuffle = () => {
        const newSeeds = Array.from({ length: 8 }, () => randomSeed());
        setGridSeeds(newSeeds);
        setSelectedSeed(newSeeds[0]);
        setCustomInput('');
    };

    return (
        <div className="space-y-5">
            {/* Large preview */}
            <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-full border-2 border-rose-500 bg-zinc-900 overflow-hidden shadow-lg shadow-rose-500/10">
                    <img
                        src={dicebearUrl(selectedSeed)}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                    />
                </div>
                <p className="text-xs text-zinc-400">Preview</p>
            </div>

            {/* Seed input + shuffle */}
            <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Custom seed (any text = unique critter)</Label>
                <div className="flex gap-2">
                    <Input
                        value={customInput}
                        onChange={(e) => handleCustomInputChange(e.target.value)}
                        placeholder={`e.g. "${username}" or anything fun`}
                        className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50 text-sm h-9"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleShuffle}
                        className="shrink-0 border-zinc-700 hover:bg-zinc-800 h-9 w-9"
                        title="Shuffle random styles"
                    >
                        <Shuffle className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* 8-seed grid */}
            <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Or pick a style</Label>
                <div className="grid grid-cols-4 gap-2">
                    {gridSeeds.map((seed) => (
                        <button
                            key={seed}
                            type="button"
                            onClick={() => { setSelectedSeed(seed); setCustomInput(seed); }}
                            className={cn(
                                'relative w-full aspect-square rounded-xl border-2 bg-zinc-900 overflow-hidden transition-all',
                                selectedSeed === seed
                                    ? 'border-rose-500 shadow-md shadow-rose-500/20'
                                    : 'border-zinc-800 hover:border-zinc-600'
                            )}
                        >
                            <img
                                src={dicebearUrl(seed)}
                                alt={seed}
                                className="w-full h-full object-cover"
                            />
                            {selectedSeed === seed && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <Button
                onClick={() => onSelect({ type: 'dicebear', seed: selectedSeed, avatarUrl: dicebearUrl(selectedSeed) })}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white"
            >
                Use This Avatar
            </Button>
        </div>
    );
}

// ── Photo upload + crop tab ───────────────────────────────────────────────────

function PhotoPicker({ userId, onSelect }: {
    userId: string;
    onSelect: (result: PhotoPickerResult) => void;
}) {
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [brightness, setBrightness] = useState(100);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({ title: 'Invalid file', description: 'Please upload an image.', variant: 'destructive' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast({ title: 'File too large', description: 'Max 10MB.', variant: 'destructive' });
            return;
        }

        const url = URL.createObjectURL(file);
        setImageSrc(url);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setBrightness(100);
    };

    const onCropComplete = useCallback((_: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleUpload = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsUploading(true);
        try {
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, brightness);
            if (!blob) throw new Error('Crop failed');

            const rawFile = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
            const compressed = await compressImageForUpload(rawFile, AVATAR_COMPRESS_PRESET);

            const formData = new FormData();
            formData.append('file', compressed);
            formData.append('bucket', 'users.avatars');
            formData.append('folder', `avatars/${userId}`);

            const { url } = await apiClient.upload<{ url: string }>('/api/storage/upload', formData);
            onSelect({ type: 'photo', avatarUrl: url });
        } catch (err: any) {
            toast({ title: 'Upload failed', description: err.message || 'Something went wrong.', variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    if (!imageSrc) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 rounded-xl border-2 border-dashed border-zinc-700 hover:border-rose-500/60 bg-zinc-900/40 hover:bg-zinc-900/60 transition-colors flex flex-col items-center justify-center gap-3 text-zinc-400 hover:text-zinc-200"
                >
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium">Click to upload a photo</p>
                        <p className="text-xs text-zinc-500 mt-0.5">PNG, JPG, WebP up to 10MB</p>
                    </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Cropper */}
            <div className="relative h-64 rounded-xl overflow-hidden bg-zinc-950">
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
                        containerStyle: { borderRadius: '0.75rem' },
                        mediaStyle: { filter: `brightness(${brightness}%)` },
                    }}
                />
            </div>

            {/* Controls */}
            <div className="space-y-3">
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs text-zinc-400">Zoom</Label>
                        <span className="text-xs text-zinc-500">{zoom.toFixed(1)}×</span>
                    </div>
                    <Slider
                        min={1}
                        max={3}
                        step={0.05}
                        value={[zoom]}
                        onValueChange={([v]) => setZoom(v)}
                        className="[&_[role=slider]]:bg-rose-500"
                    />
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Label className="text-xs text-zinc-400">Brightness</Label>
                        <span className="text-xs text-zinc-500">{brightness}%</span>
                    </div>
                    <Slider
                        min={60}
                        max={140}
                        step={1}
                        value={[brightness]}
                        onValueChange={([v]) => setBrightness(v)}
                        className="[&_[role=slider]]:bg-rose-500"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setImageSrc(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="border-zinc-700 hover:bg-zinc-800 text-white"
                >
                    Change Photo
                </Button>
                <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                >
                    {isUploading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                        <><Upload className="w-4 h-4 mr-2" /> Upload & Use</>
                    )}
                </Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
    );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
    open,
    onClose,
    userId,
    username,
    currentSeed,
    onSelect,
}) => {
    const handleSelect = (result: AvatarPickerSelection) => {
        onSelect(result);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md bg-[#121214] border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Choose Avatar</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="avatar" className="mt-1">
                    <TabsList className="w-full bg-zinc-900/50 border border-zinc-800 p-1 mb-4">
                        <TabsTrigger value="avatar" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                            Generate Avatar
                        </TabsTrigger>
                        <TabsTrigger value="photo" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                            Upload Photo
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="avatar" className="mt-0">
                        <DiceBearPicker
                            userId={userId}
                            username={username}
                            currentSeed={currentSeed}
                            onSelect={handleSelect}
                        />
                    </TabsContent>

                    <TabsContent value="photo" className="mt-0">
                        <PhotoPicker userId={userId} onSelect={handleSelect} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};

export default AvatarPickerModal;
