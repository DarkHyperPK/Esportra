import React, { useState, useRef } from 'react';
import { User, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AvatarUploaderProps {
    value: string | null;
    onChange: (url: string) => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    uploadPath?: string;
}

const AvatarUploader = ({ value, onChange, size = 'xl', uploadPath }: AvatarUploaderProps) => {
    const [isUploading, setIsUploading] = useState(false);
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

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

            const { data, error } = await supabase.storage
                .from('users.avatars')
                .upload(uploadPath || fileName, file, { cacheControl: '3600', upsert: false });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('users.avatars')
                .getPublicUrl(data.path);

            onChange(urlData.publicUrl);

            toast({
                title: 'Avatar updated',
                description: 'Looking good!',
            });
        } catch (error: any) {
            console.error('Upload error:', error);
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
                "rounded-full overflow-hidden border-2 border-zinc-700 bg-zinc-900 group-hover:border-rose-500 transition-colors flex items-center justify-center",
                sizeClasses[size]
            )}>
                {value ? (
                    <img src={value} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                    <User className="w-1/2 h-1/2 text-zinc-600" />
                )}
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
        </div>
    );
};

export default AvatarUploader;
