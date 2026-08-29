import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, RotateCcw, Check, Sun } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { CtaButton, DangerButton } from '@/components/ui/app-buttons';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface ImageUploaderProps {
    value: string | null;
    onChange: (url: string | null) => void;
    bucket?: string;
    folder?: string;
    aspectRatio?: 'banner' | 'logo' | 'video';
    label?: string;
    helperText?: string;
    customFileName?: string;
    useTimestamp?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    value,
    onChange,
    bucket = 'tournament-images',
    folder = 'uploads',
    aspectRatio = 'banner',
    label = 'Upload Image',
    helperText,
    customFileName,
    useTimestamp: _useTimestamp = true,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [brightness, setBrightness] = useState(100);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    const aspect = aspectRatio === 'logo' ? 1 : 16 / 9;
    const dimensions = aspectRatio === 'logo'
        ? { width: 512, height: 512, display: '1:1' }
        : { width: 1920, height: 1080, display: '16:9' };

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const readFile = (file: File) => {
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result as string));
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file',
                description: 'Please upload an image file (JPG, PNG, or WebP)',
                variant: 'destructive',
            });
            return;
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Please upload an image smaller than 10MB',
                variant: 'destructive',
            });
            return;
        }

        const imageDataUrl = await readFile(file);
        setOriginalFile(file);
        setImageSrc(imageDataUrl);
        setZoom(1);
        setBrightness(100);
    }, [toast]);

    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            setIsUploading(true);
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0, { horizontal: false, vertical: false }, brightness);

            if (!croppedImageBlob) {
                throw new Error('Failed to crop image');
            }

            // Create a File from Blob
            const croppedFile = new File([croppedImageBlob], originalFile?.name || 'image.jpg', {
                type: 'image/jpeg', // getCroppedImg returns jpeg
            });

            await uploadToSupabase(croppedFile);
            setImageSrc(null); // Close cropper
        } catch (e: any) {
            console.error(e);
            toast({
                title: 'Error processing image',
                description: e.message || 'Could not crop image',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const uploadToSupabase = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', bucket);
            formData.append('folder', folder);

            const result = await apiClient.upload<{ url: string; path: string }>(
                '/api/storage/upload',
                formData,
            );

            // Append timestamp to bust cache if updating same file
            const publicUrl = customFileName
                ? `${result.url}?t=${Date.now()}`
                : result.url;

            onChange(publicUrl);

            toast({
                title: 'Image uploaded',
                description: 'Your image has been updated successfully',
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            throw error;
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleRemove = useCallback(() => {
        onChange(null);
    }, [onChange]);

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-white">{label}</label>

            {value ? (
                // Preview
                <div className={cn(
                    "relative rounded-xl overflow-hidden border border-zinc-800 bg-black/20 group",
                    aspectRatio === 'banner' || aspectRatio === 'video' ? "aspect-video" : "aspect-square w-32"
                )}>
                    <img
                        src={value}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4 gap-2">
                        <button type="button"
                            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'bg-white/10 backdrop-blur-md border-white/10 hover:bg-white/20 text-white text-xs')}
                            onClick={() => inputRef.current?.click()}
                        >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Change
                        </button>
                        <DangerButton
                            type="button"
                            size="sm"
                            className="backdrop-blur-md border"
                            onClick={handleRemove}
                        >
                            <X className="w-3.5 h-3.5 mr-1.5" />
                            Remove
                        </DangerButton>
                    </div>
                </div>
            ) : (
                // Upload zone
                <div
                    className={cn(
                        "group relative rounded-xl border transition-all cursor-pointer overflow-hidden",
                        aspectRatio === 'banner' || aspectRatio === 'video' ? "aspect-video" : "aspect-square w-32",
                        isDragging
                            ? "border-rose-500/40 bg-rose-500/5 shadow-[0_0_30px_-5px_rgba(244,63,94,0.15)]"
                            : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80",
                        isUploading && "pointer-events-none"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => inputRef.current?.click()}
                >
                    {isUploading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 rounded-xl">
                            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-2" />
                            <span className="text-sm font-medium text-white">Uploading...</span>
                        </div>
                    ) : null}

                    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                        <div className={cn(
                            "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                            isDragging
                                ? "bg-rose-500/10 border border-rose-500/30"
                                : "bg-zinc-800/80 border border-zinc-700/50 group-hover:border-zinc-600"
                        )}>
                            <Upload className={cn(
                                "w-5 h-5 transition-colors",
                                isDragging ? "text-rose-400" : "text-zinc-500 group-hover:text-zinc-400"
                            )} />
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-zinc-400">
                                <span className="text-rose-400 font-semibold group-hover:text-rose-300 transition-colors">Click to upload</span>
                                {' '}or drag and drop
                            </p>
                            <p className="text-[11px] text-zinc-600 mt-1">
                                {dimensions.width}×{dimensions.height} ({dimensions.display}) • Max 10MB
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    // Reset input so same file can be selected again
                    e.target.value = '';
                }}
            />

            {helperText && (
                <p className="text-xs text-gray-500">{helperText}</p>
            )}

            {/* Cropper Dialog */}
            <Dialog open={!!imageSrc} onOpenChange={(open) => !open && setImageSrc(null)}>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col bg-[#0a0a0c] border border-white/10 p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-white">Adjust Image</DialogTitle>
                        <DialogDescription>Drag to reposition. Use slider to zoom.</DialogDescription>
                    </DialogHeader>

                    <div className="relative flex-1 bg-black w-full overflow-hidden">
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspect}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                style={{
                                    containerStyle: { background: '#000' },
                                    cropAreaStyle: { border: '2px solid #f43f5e' },
                                    mediaStyle: { filter: `brightness(${brightness}%)` },
                                }}
                            />
                        )}
                    </div>

                    <div className="p-6 bg-[#0a0a0c] border-t border-white/10 z-20 space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest w-20">Zoom</span>
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(val) => setZoom(val[0])}
                                className="flex-1"
                            />
                            <span className="text-xs font-mono text-zinc-500 w-10 text-right">{zoom.toFixed(1)}x</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest w-20 flex items-center gap-1.5">
                                <Sun className="w-3.5 h-3.5 text-yellow-500" /> Bright
                            </span>
                            <Slider
                                value={[brightness]}
                                min={50}
                                max={150}
                                step={1}
                                onValueChange={(val) => setBrightness(val[0])}
                                className="flex-1"
                            />
                            <span className="text-xs font-mono text-zinc-500 w-10 text-right">{brightness}%</span>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setImageSrc(null)} disabled={isUploading}>
                                Cancel
                            </Button>
                            <CtaButton onClick={handleCropSave} disabled={isUploading} className="min-w-[100px]">
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> Save Image</>}
                            </CtaButton>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ImageUploader;
