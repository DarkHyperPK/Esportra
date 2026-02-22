import React, { useState } from 'react';
import { FileImage, Upload, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { supabase } from '@/lib/supabase';
import { getTierFeatures } from '@/utils/permissions';
import { usePartnerMutations } from '@/hooks/usePartnerMutations';

const Assets = () => {
    const { data, refetch } = usePartnerData();
    const sponsor = data?.sponsor;
    const features = getTierFeatures(sponsor?.tier);
    const { updateProfile } = usePartnerMutations(sponsor?.id || '');

    const [uploading, setUploading] = useState<'logo' | 'banner' | 'gallery' | null>(null);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'gallery') => {
        if (!event.target.files || event.target.files.length === 0 || !sponsor) return;

        const file = event.target.files[0];

        // Validation
        const limit = 3 * 1024 * 1024; // 3MB
        if (file.size > limit) {
            alert("File too large. Max size is 3MB.");
            return;
        }

        if (type === 'gallery') {
            const currentCount = sponsor.gallery_images?.length || 0;
            if (currentCount >= features.maxShowcaseImages) {
                alert(`Limit reached. Your tier allows maximum ${features.maxShowcaseImages} images.`);
                return;
            }
        }

        setUploading(type);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${sponsor.id}/${type}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('system.assets.partners')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('system.assets.partners')
                .getPublicUrl(fileName);

            if (type === 'logo') {
                await updateProfile.mutateAsync({ logo_url: publicUrl });
            } else if (type === 'banner') {
                await updateProfile.mutateAsync({ banner_image_url: publicUrl });
            } else if (type === 'gallery') {
                const newGallery = [...(sponsor.gallery_images || []), publicUrl];
                await updateProfile.mutateAsync({ gallery_images: newGallery });
            }

            await refetch();
            alert('Asset uploaded successfully!');

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert(`Upload failed: ${error.message || 'Unknown error'}`);
        } finally {
            setUploading(null);
        }
    };

    const handleDeleteImage = async (imageUrl: string) => {
        if (!sponsor || !confirm('Are you sure you want to remove this image?')) return;

        try {
            const newGallery = (sponsor.gallery_images || []).filter(url => url !== imageUrl);
            await updateProfile.mutateAsync({ gallery_images: newGallery });
            await refetch();
        } catch (error: any) {
            alert('Failed to delete image');
        }
    };

    return (
        <div className="space-y-12">
            <div className="border-l-2 border-rose-500 pl-6">
                <h2 className="text-3xl font-black font-heading tracking-tighter mb-2 uppercase italic">Asset_Management</h2>
                <div className="flex items-center gap-3">
                    <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Media_Resources</p>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 ${features.color}`}>
                        {features.label}
                    </span>
                </div>
            </div>

            {/* Main Branding Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Logo Section */}
                <div className="p-8 rounded-2xl bg-[#08080a] border border-white/5 space-y-6 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold flex items-center gap-2 text-white">
                                <ImageIcon className="w-4 h-4 text-rose-500" />
                                Brand_Logo
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">1:1 ASPECT • PNG/SVG</p>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-900 px-2 py-1 rounded text-zinc-500">MAX 3MB</span>
                    </div>

                    <div className="aspect-square rounded-xl bg-black border border-zinc-800 flex items-center justify-center relative group-hover:border-rose-500/30 transition-all duration-300 overflow-hidden shadow-2xl">
                        {sponsor?.logo_url ? (
                            <img src={sponsor.logo_url} alt="Logo" className="w-3/4 h-3/4 object-contain" />
                        ) : (
                            <div className="text-zinc-800 text-xs font-mono">NO_ASSET</div>
                        )}

                        {uploading === 'logo' ? (
                            <div className="absolute inset-0 bg-black/90 flex items-center justify-center backdrop-blur-sm">
                                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                            </div>
                        ) : (
                            <label className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="w-6 h-6 text-white mb-2" />
                                <span className="text-xs font-mono text-white">UPDATE_ASSET</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} />
                            </label>
                        )}
                    </div>
                </div>

                {/* Banner Section */}
                <div className={`p-8 rounded-2xl bg-[#08080a] border border-white/5 space-y-6 relative overflow-hidden ${!features.canUploadBanner ? 'opacity-40 grayscale' : 'group'}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold flex items-center gap-2 text-white">
                                <FileImage className="w-4 h-4 text-blue-500" />
                                Campaign_Banner
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">16:9 ASPECT • 1920x1080</p>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-900 px-2 py-1 rounded text-zinc-500">MAX 3MB</span>
                    </div>

                    <div className="aspect-video rounded-xl bg-black border border-zinc-800 flex items-center justify-center relative group-hover:border-blue-500/30 transition-all duration-300 overflow-hidden shadow-2xl">
                        {sponsor?.banner_image_url ? (
                            <img src={sponsor.banner_image_url} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-zinc-800 text-xs font-mono">
                                {features.canUploadBanner ? 'NO_ASSET' : 'LOCKED_FEATURE'}
                            </div>
                        )}

                        {features.canUploadBanner ? (
                            uploading === 'banner' ? (
                                <div className="absolute inset-0 bg-black/90 flex items-center justify-center backdrop-blur-sm">
                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                </div>
                            ) : (
                                <label className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Upload className="w-6 h-6 text-white mb-2" />
                                    <span className="text-xs font-mono text-white">UPDATE_BANNER</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'banner')} />
                                </label>
                            )
                        ) : (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-zinc-800" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Gallery Section - THE NEW MULTI-IMAGE GALLERY */}
            <div className="p-8 rounded-2xl bg-[#08080a] border border-white/5 space-y-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <ImageIcon className="w-5 h-5 text-emerald-500" />
                            Showcase_Gallery
                        </h3>
                        <p className="text-zinc-500 text-sm mt-2 max-w-md">
                            Upload high-impact shots of your products or services. These rotate in your premium partner showcase.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-[10px] font-mono text-zinc-500 uppercase">Usage_Quota</div>
                            <div className="text-sm font-mono text-white">
                                <span className={sponsor?.gallery_images?.length === features.maxShowcaseImages ? 'text-rose-500' : 'text-emerald-500'}>
                                    {sponsor?.gallery_images?.length || 0}
                                </span>
                                <span className="text-zinc-600"> / {features.maxShowcaseImages}</span>
                            </div>
                        </div>
                        <label className={`
                            flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold transition-all
                            ${(sponsor?.gallery_images?.length || 0) < features.maxShowcaseImages
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
                        `}>
                            {uploading === 'gallery' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {uploading === 'gallery' ? 'UPLOADING...' : 'ADD_IMAGE'}
                            {(sponsor?.gallery_images?.length || 0) < features.maxShowcaseImages && (
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'gallery')} />
                            )}
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {sponsor?.gallery_images?.map((url, idx) => (
                        <div key={idx} className="group relative aspect-square rounded-xl bg-black border border-zinc-800 overflow-hidden hover:border-emerald-500/40 transition-colors">
                            <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <button
                                onClick={() => handleDeleteImage(url)}
                                className="absolute top-2 right-2 p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}

                    {/* Empty Slots */}
                    {Array.from({ length: Math.max(0, features.maxShowcaseImages - (sponsor?.gallery_images?.length || 0)) }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="aspect-square rounded-xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-800 text-[10px] font-mono uppercase">
                            Slot_{(sponsor?.gallery_images?.length || 0) + idx + 1}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Assets;
