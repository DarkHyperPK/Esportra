import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
    value: string | null;
    onChange: (url: string | null) => void;
    bucket?: string;
    folder?: string;
    aspectRatio?: 'banner' | 'logo';
    label?: string;
    helperText?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
    value,
    onChange,
    bucket = 'tournament-images',
    folder = 'uploads',
    aspectRatio = 'banner',
    label = 'Upload Image',
    helperText,
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const dimensions = aspectRatio === 'banner'
        ? { width: 1920, height: 1080, display: '16:9' }
        : { width: 512, height: 512, display: '1:1' };

    const handleUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file',
                description: 'Please upload an image file (JPG, PNG, or WebP)',
                variant: 'destructive',
            });
            return;
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: 'File too large',
                description: 'Please upload an image smaller than 5MB',
                variant: 'destructive',
            });
            return;
        }

        setIsUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            onChange(urlData.publicUrl);

            toast({
                title: 'Image uploaded',
                description: 'Your image has been uploaded successfully',
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: 'Upload failed',
                description: error.message || 'Failed to upload image',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    }, [bucket, folder, onChange, toast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

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
                    "relative rounded-lg overflow-hidden border border-gray-700",
                    aspectRatio === 'banner' ? "aspect-video" : "aspect-square w-32"
                )}>
                    <img
                        src={value}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
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
                        "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
                        aspectRatio === 'banner' ? "aspect-video" : "aspect-square w-32",
                        isDragging
                            ? "border-gaming-purple bg-gaming-purple/10"
                            : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50",
                        isUploading && "pointer-events-none opacity-50"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file);
                        }}
                    />

                    <div className="flex flex-col items-center justify-center h-full">
                        {isUploading ? (
                            <Loader2 className="w-8 h-8 text-gaming-purple animate-spin" />
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            )}

            {helperText && (
                <p className="text-xs text-gray-500">{helperText}</p>
            )}
        </div>
    );
};

export default ImageUploader;
