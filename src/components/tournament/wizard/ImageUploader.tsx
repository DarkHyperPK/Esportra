import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, RotateCcw, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
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
    aspectRatio?: 'banner' | 'logo';
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
    useTimestamp = true,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [originalFile, setOriginalFile] = useState<File | null>(null);

    const aspect = aspectRatio === 'banner' ? 16 / 9 : 1;
    const dimensions = aspectRatio === 'banner'
        ? { width: 1920, height: 1080, display: '16:9' }
        : { width: 512, height: 512, display: '1:1' };

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const readFile = (file: File) => {
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result as string));
            reader.readAsDataURL(file);
        });
    };

    const handleFileSelect = async (file: File) => {
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
    };

    const handleCropSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            setIsUploading(true);
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

            if (!croppedImageBlob) {
                throw new Error('Failed to crop image');
            }

            // Create a File from Blob
            const fileExt = originalFile?.name.split('.').pop() || 'jpg';
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
            const fileExt = file.name.split('.').pop();
            const timePart = useTimestamp ? `${Date.now()}-` : '';
            const randomPart = useTimestamp ? `-${Math.random().toString(36).substr(2, 9)}` : '';

            const fileName = customFileName
                ? `${folder}/${customFileName}.${fileExt}`
                : `${folder}/${timePart}${Math.random().toString(36).substr(2, 9)}${randomPart}.${fileExt}`;

            // Add cache busting query param if replacing
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: !!customFileName || !useTimestamp,
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            // Append timestamp to bust cache if updating same file
            const publicUrl = customFileName
                ? `${urlData.publicUrl}?t=${Date.now()}`
                : urlData.publicUrl;

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
    }, []);

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
                    "relative rounded-lg overflow-hidden border border-gray-700 bg-black/20",
                    aspectRatio === 'banner' ? "aspect-video" : "aspect-square w-32"
                )}>
                    <img
                        src={value}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => inputRef.current?.click()}
                        >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Change
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleRemove}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Remove
                        </Button>
                    </div>
                </div>
            ) : (
                // Upload zone
                <div
                    className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer relative",
                        aspectRatio === 'banner' ? "aspect-video" : "aspect-square w-32",
                        isDragging
                            ? "border-gaming-purple bg-gaming-purple/10"
                            : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50",
                        isUploading && "pointer-events-none"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => inputRef.current?.click()}
                >
                    {isUploading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10 rounded-lg">
                            <Loader2 className="w-8 h-8 text-gaming-purple animate-spin mb-2" />
                            <span className="text-sm font-medium text-white">Uploading...</span>
                        </div>
                    ) : null}

                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mb-3">
                            {aspectRatio === 'banner' ? (
                                <Upload className="w-6 h-6 text-gray-400" />
                            ) : (
                                <ImageIcon className="w-6 h-6 text-gray-400" />
                            )}
                        </div>
                        <p className="text-sm text-gray-400 mb-1">
                            <span className="text-gaming-purple font-medium">Click to upload</span>
                            {' '}or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                            Recommended: {dimensions.width}×{dimensions.height} ({dimensions.display})
                        </p>
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
                                    cropAreaStyle: { border: '2px solid #a855f7' },
                                }}
                            />
                        )}
                    </div>

                    <div className="p-6 bg-[#0a0a0c] border-t border-white/10 z-20 space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Zoom</span>
                            <Slider
                                value={[zoom]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={(val) => setZoom(val[0])}
                                className="flex-1"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="ghost" onClick={() => setImageSrc(null)} disabled={isUploading}>
                                Cancel
                            </Button>
                            <Button onClick={handleCropSave} disabled={isUploading} className="bg-gaming-purple hover:bg-gaming-purple/80 text-white min-w-[100px]">
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-2" /> Save Image</>}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ImageUploader;
