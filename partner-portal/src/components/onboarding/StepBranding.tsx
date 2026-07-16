import { type ReactNode, useState } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Upload, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export interface StepBrandingProps {
    data: Record<string, string | null> | undefined;
    sponsorId: string;
    onSave: (d: Record<string, string | null>) => void;
    onBack?: () => void;
    saving: boolean;
    canContinue?: boolean;
    termsCheckbox?: ReactNode;
}

const StepBranding = ({ data, sponsorId, onSave, onBack, saving, canContinue = true, termsCheckbox }: StepBrandingProps) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(data?.logo_url || null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const handleFileUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'system.assets.partners');
            formData.append('folder', sponsorId);

            const result = await apiClient.upload<{ url: string }>('/api/storage/upload', formData);
            setLogoUrl(result.url);

            await apiClient.put('/api/sponsors/me', { logo_url: result.url });
        } catch {
            setLogoUrl(null);
            setUploadError('Logo upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black tracking-tight mb-2">
                    UPLOAD<span className="text-rose-500">_BRAND</span> ASSETS
                </h2>
                <p className="text-zinc-500 text-sm">
                    Your logo will appear across the Esportra platform. For best results, use a transparent PNG or SVG.
                </p>
            </div>

            {uploadError && <p role="alert" className="text-sm text-rose-400">{uploadError}</p>}

            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer ${dragOver
                    ? 'border-rose-500 bg-rose-500/5'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e: Event) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleFileUpload(file);
                    };
                    input.click();
                }}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
                        <p className="text-sm text-zinc-400">Processing upload...</p>
                    </div>
                ) : logoUrl ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-32 h-32 rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-center">
                            <img src={logoUrl} alt="Logo" loading="lazy" className="max-w-full max-h-full object-contain" />
                        </div>
                        <p className="text-xs text-zinc-500">Click or drag to replace</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); setLogoUrl(null); }}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Remove
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            <Upload className="w-7 h-7 text-zinc-600" />
                        </div>
                        <div>
                            <p className="text-sm text-white font-medium">Drop your logo here</p>
                            <p className="text-xs text-zinc-500 mt-1">PNG, SVG, or WebP • Max 5MB</p>
                        </div>
                    </div>
                )}
            </div>

            {termsCheckbox && <div className="pt-2">{termsCheckbox}</div>}

            <div className="flex gap-3">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex-1 py-4 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                )}
                <button
                    onClick={() => onSave({ logo_url: logoUrl })}
                    disabled={saving || !canContinue}
                    className={`${onBack ? 'flex-[2]' : 'flex-1'} py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider`}
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            {logoUrl ? 'Continue' : 'Skip for Now'} <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default StepBranding;
