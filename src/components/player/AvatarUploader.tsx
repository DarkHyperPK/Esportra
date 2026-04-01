import React, { useState, useRef } from 'react';
import { User, Camera, Loader2, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import EntityAvatar from '@/components/ui/EntityAvatar';

interface AvatarUploaderProps {
    value: string | null;
    onChange: (url: string) => void;
    onRemove?: () => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    uploadPath?: string;
}

const AvatarUploader = ({ value, onChange, onRemove, size = 'xl', uploadPath }: AvatarUploaderProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const sizeClasses = {
        sm: 'w-10 h-10',
        md: 'w-16 h-16',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast({
                title: 'Invalid file',
                description: 'Please upload an image file.',
                variant: 'destructive',
            });
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast({
                title: 'File too large',
                description: 'Max size is 5MB.',
                variant: 'destructive',
            });
            return;
        }

        // Instant local preview
        const blobUrl = URL.createObjectURL(file);
        setLocalPreview(blobUrl);

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();

            // Use uploadPath if provided (e.g. "Player-cards/team_name/userId_card.png")
            // Otherwise default to avatars folder
            const folder = uploadPath
                ? uploadPath.substring(0, uploadPath.lastIndexOf('/'))
                : 'avatars';

            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'users.avatars');
            formData.append('folder', folder);

            const result = await apiClient.upload<{ url: string }>(
                '/api/storage/upload',
                formData,
            );

            onChange(result.url);
            setLocalPreview(null);

            toast({
                title: uploadPath ? 'Player card updated' : 'Avatar updated',
                description: 'Looking good!',
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            setLocalPreview(null);
            toast({
                title: 'Upload failed',
                description: error.message || 'Something went wrong.',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="relative group cursor-pointer inline-block" onClick={() => !isUploading && inputRef.current?.click()}>
            <div className={cn(
                "rounded-full border-2 border-zinc-700 bg-zinc-900 group-hover:border-rose-500 transition-colors flex items-center justify-center p-0", // Removed overflow-hidden to let EntityAvatar handle it, removed padding
            )}>
                <EntityAvatar
                    src={localPreview || value}
                    name="Avatar"
                    type="user"
                    size={sizeClasses[size]}
                    className="border-none" // Remove border from EntityAvatar to avoid double border
                />
            </div>

            {/* Overlay */}
            <div className={cn(
                "absolute inset-0 rounded-full bg-black/50 flex items-center justify-center transition-opacity duration-200",
                isUploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                {isUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                    <div className="bg-rose-500 p-2 rounded-full text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <Camera className="w-4 h-4" />
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
            />

            {/* Remove button */}
            {onRemove && (value || localPreview) && !isUploading && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                        setLocalPreview(null);
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg z-10"
                >
                    <X className="w-3.5 h-3.5 text-white" />
                </button>
            )}
        </div>
    );
};

export default AvatarUploader;
