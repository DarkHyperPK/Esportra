import React, { useState } from 'react';
import { FileImage, Upload, Image as ImageIcon, Loader2, AlertCircle, FileText, Save, X, Trash2 } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { apiClient } from '@/lib/apiClient';
import { getTierFeatures } from '@/utils/permissions';
import { usePartnerMutations } from '@/hooks/usePartnerMutations';
import { useToast } from '@/hooks/use-toast';

/** Extract storage path from a Supabase public URL for deletion */
const extractStoragePath = (publicUrl: string): { bucket: string; path: string } | null => {
    const match = publicUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1], path: match[2] };
};

const Assets = () => {
    const { data, refetch } = usePartnerData();
    const sponsor = data?.sponsor;
    const features = getTierFeatures(sponsor?.tier);
    const { updateProfile } = usePartnerMutations();

    const [uploading, setUploading] = useState<'logo' | 'banner' | 'gallery' | 'deck' | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [campaignLogoUrl, setCampaignLogoUrl] = useState<string | null>(() => {
        if (!sponsor?.id) return null;
        return localStorage.getItem(`campaign-logo-${sponsor.id}`);
    });
    const [copyData, setCopyData] = useState({
        tagline: sponsor?.tagline || '',
        cta_text: sponsor?.cta_text || '',
        description: sponsor?.description || '',
        discount_text: sponsor?.discount_text || '',
    });
    const [isSavingCopy, setIsSavingCopy] = useState(false);
    const { toast } = useToast();

    // Restore campaign logo URL from localStorage when sponsor loads
    React.useEffect(() => {
        if (sponsor?.id) {
            const saved = localStorage.getItem(`campaign-logo-${sponsor.id}`);
            if (saved) setCampaignLogoUrl(saved);
        }
    }, [sponsor?.id]);

    /** Delete a file from Supabase storage (best-effort, non-blocking) */
    const deleteStorageFile = async (url: string) => {
        const info = extractStoragePath(url);
        if (!info) return;
        try {
            await apiClient.delete(`/api/storage/delete?bucket=${encodeURIComponent(info.bucket)}&path=${encodeURIComponent(info.path)}`);
        } catch {
            // Non-fatal — file may already be gone
        }
    };

    /** Delete logo or banner */
    const handleDeleteAsset = async (type: 'logo' | 'banner') => {
        if (!sponsor || !confirm(`Remove the ${type === 'logo' ? 'campaign logo' : 'banner'}?`)) return;
        const url = type === 'logo' ? campaignLogoUrl : sponsor.banner_image_url;
        setDeleting(type);
        try {
            if (url) await deleteStorageFile(url);
            if (type === 'logo') {
                localStorage.removeItem(`campaign-logo-${sponsor.id}`);
                setCampaignLogoUrl(null);
            } else {
                await updateProfile.mutateAsync({ banner_image_url: '' });
            }
            await refetch();
            toast({ title: `${type === 'logo' ? 'Campaign logo' : 'Banner'} removed.` });
        } catch {
            toast({ title: `Failed to remove ${type}`, variant: 'destructive' });
        } finally {
            setDeleting(null);
        }
    };

    // Sync copyData when sponsor loads
    React.useEffect(() => {
        if (sponsor) {
            setCopyData({
                tagline: sponsor.tagline || '',
                cta_text: sponsor.cta_text || '',
                description: sponsor.description || '',
                discount_text: sponsor.discount_text || '',
            });
        }
    }, [sponsor]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'gallery' | 'deck') => {
        if (!event.target.files || event.target.files.length === 0 || !sponsor) return;

        const file = event.target.files[0];
        const limit = type === 'deck' ? 10 * 1024 * 1024 : 3 * 1024 * 1024; // 10MB for deck, 3MB for images

        if (file.size > limit) {
            toast({ title: 'File too large', description: `Max size is ${type === 'deck' ? '10MB' : '3MB'}.`, variant: 'destructive' });
            return;
        }

        if (type === 'deck') {
            const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-powerpoint'];
            if (!allowed.includes(file.type)) {
                toast({ title: 'Invalid file type', description: 'Please upload a PDF or PowerPoint file.', variant: 'destructive' });
                return;
            }
        }

        if (type === 'gallery') {
            const currentCount = sponsor.gallery_images?.length || 0;
            if (currentCount >= features.maxShowcaseImages) {
                toast({ title: 'Limit reached', description: `Your tier allows maximum ${features.maxShowcaseImages} images.`, variant: 'destructive' });
                return;
            }
        }

        setUploading(type);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'system.assets.partners');
            formData.append('folder', sponsor.id);

            const uploadResult = await apiClient.upload<{ url: string }>('/api/storage/upload', formData);
            const publicUrl = uploadResult.url;

            if (type === 'logo') {
                // Campaign Kit logo — separate from sponsors.logo_url (profile logo)
                if (sponsor.id) {
                    localStorage.setItem(`campaign-logo-${sponsor.id}`, publicUrl);
                    setCampaignLogoUrl(publicUrl);
                }
            } else if (type === 'banner') {
                await updateProfile.mutateAsync({ banner_image_url: publicUrl });
            } else if (type === 'deck') {
                await updateProfile.mutateAsync({ detail_deck_url: publicUrl });
            } else if (type === 'gallery') {
                const newGallery = [...(sponsor.gallery_images || []), publicUrl];
                await updateProfile.mutateAsync({ gallery_images: newGallery });
            }

            await refetch();
            toast({ title: type === 'deck' ? 'Detail deck uploaded!' : 'Asset uploaded successfully!' });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast({ title: 'Upload failed', description: message, variant: 'destructive' });
        } finally {
            setUploading(null);
        }
    };

    const handleDeleteImage = async (imageUrl: string) => {
        if (!sponsor || !confirm('Are you sure you want to remove this image?')) return;

        try {
            await deleteStorageFile(imageUrl);
            const newGallery = (sponsor.gallery_images || []).filter(url => url !== imageUrl);
            await updateProfile.mutateAsync({ gallery_images: newGallery });
            await refetch();
        } catch {
            toast({ title: 'Failed to delete image', variant: 'destructive' });
        }
    };

    const handleRemoveDeck = async () => {
        if (!sponsor || !confirm('Remove the detail deck?')) return;
        try {
            if (sponsor.detail_deck_url) await deleteStorageFile(sponsor.detail_deck_url);
            await updateProfile.mutateAsync({ detail_deck_url: '' });
            await refetch();
        } catch {
            toast({ title: 'Failed to remove deck', variant: 'destructive' });
        }
    };

    const handleSaveCopy = async () => {
        setIsSavingCopy(true);
        try {
            await updateProfile.mutateAsync(copyData);
        } catch {
            // hook shows toast
        } finally {
            setIsSavingCopy(false);
        }
    };

    const deckFilename = sponsor?.detail_deck_url ? decodeURIComponent(sponsor.detail_deck_url.split('/').pop() || 'document') : null;

    return (
        <div className="space-y-12">
            <div className="border-l-2 border-rose-500 pl-6">
                <h2 className="text-3xl font-black font-heading tracking-tighter mb-2 uppercase italic">Campaign_Kit</h2>
                <div className="flex items-center gap-3">
                    <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Media, Copy & Detail Deck</p>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border border-white/10 bg-white/5 ${features.color}`}>
                        {features.label}
                    </span>
                </div>
            </div>

            {/* ─── SECTION 1: Brand Assets ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Campaign Kit Logo (separate from profile logo) */}
                <div className="p-8 rounded-2xl bg-[#08080a] border border-white/5 space-y-6 group">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold flex items-center gap-2 text-white">
                                <ImageIcon className="w-4 h-4 text-rose-500" />
                                Campaign_Logo
                            </h3>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">BRAND ASSET FOR CAMPAIGN KIT</p>
                        </div>
                        {campaignLogoUrl && (
                            <button onClick={() => handleDeleteAsset('logo')} disabled={deleting === 'logo'}
                                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50">
                                {deleting === 'logo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                        )}
                    </div>

                    <div className="aspect-square rounded-xl bg-black border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-2xl">
                        {campaignLogoUrl ? (
                            <img src={campaignLogoUrl} alt="Campaign Logo" loading="lazy" className="w-3/4 h-3/4 object-contain" />
                        ) : (
                            <div className="text-zinc-800 text-xs font-mono">NO_ASSET</div>
                        )}
                        {uploading === 'logo' && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
                            </div>
                        )}
                    </div>

                    <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-rose-500/30 cursor-pointer transition-colors text-sm">
                        <Upload className="w-4 h-4" />
                        {campaignLogoUrl ? 'Replace Logo' : 'Upload Logo'}
                        <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => handleFileUpload(e, 'logo')} />
                    </label>
                    <p className="text-[10px] text-zinc-600 font-mono text-center">
                        This is a downloadable brand asset. Profile logo is managed in <a href="/account" className="text-rose-500 hover:underline">Account Settings</a>.
                    </p>
                </div>

                {/* Banner */}
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
                            <>
                                <img src={sponsor.banner_image_url} alt="Banner" loading="lazy" className="w-full h-full object-cover" />
                                {features.canUploadBanner && (
                                    <button
                                        onClick={() => handleDeleteAsset('banner')}
                                        disabled={deleting === 'banner'}
                                        aria-label="Delete banner"
                                        className="absolute top-2 right-2 p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                                    >
                                        {deleting === 'banner' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                )}
                            </>
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

            {/* ─── SECTION 2: Detail Deck ─── */}
            <div className={`p-8 rounded-2xl bg-[#08080a] border border-white/5 space-y-6 ${!features.canUploadDeck ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <FileText className="w-5 h-5 text-amber-500" />
                            Detail_Deck
                            {!features.canUploadDeck && <span className="text-[10px] font-mono text-zinc-500 ml-2">ASCENDANT+ REQUIRED</span>}
                        </h3>
                        <p className="text-zinc-500 text-sm mt-2 max-w-lg">
                            Upload your campaign brief, ad copy specifications, and brand guidelines. Our team uses this to place your ads across the platform.
                        </p>
                    </div>
                    <span className="text-[10px] font-mono bg-zinc-900 px-2 py-1 rounded text-zinc-500 shrink-0">PDF / PPTX • MAX 10MB</span>
                </div>

                {sponsor?.detail_deck_url ? (
                    <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{deckFilename}</p>
                            <a href={sponsor.detail_deck_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-amber-500 transition-colors">
                                View Document →
                            </a>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-2">
                                {uploading === 'deck' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                Replace
                                <input type="file" className="hidden" accept=".pdf,.pptx,.ppt" onChange={(e) => handleFileUpload(e, 'deck')} />
                            </label>
                            <button onClick={handleRemoveDeck} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors" aria-label="Remove deck">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-800 rounded-xl hover:border-amber-500/30 transition-all cursor-pointer group/deck">
                        {uploading === 'deck' ? (
                            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 group-hover/deck:scale-110 transition-transform">
                                    <Upload className="w-7 h-7 text-amber-500" />
                                </div>
                                <p className="text-sm font-bold text-white mb-1">Upload Detail Deck</p>
                                <p className="text-xs text-zinc-500 font-mono">PDF or PowerPoint • Campaign brief, ad copy, brand guidelines</p>
                            </>
                        )}
                        <input type="file" className="hidden" accept=".pdf,.pptx,.ppt" onChange={(e) => handleFileUpload(e, 'deck')} />
                    </label>
                )}
            </div>

            {/* ─── SECTION 3: Campaign Copy ─── */}
            <div className="p-8 rounded-2xl bg-[#08080a] border border-white/5 space-y-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-rose-500" />
                        Campaign_Copy
                    </h3>
                    <p className="text-zinc-500 text-sm max-w-lg">
                        Text displayed alongside your ads on the platform. Keep it concise and impactful.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Tagline</label>
                        <input
                            type="text"
                            value={copyData.tagline}
                            onChange={(e) => setCopyData({ ...copyData, tagline: e.target.value })}
                            placeholder="e.g. Unleash Your PC's True Potential"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Call to Action</label>
                        <input
                            type="text"
                            value={copyData.cta_text}
                            onChange={(e) => setCopyData({ ...copyData, cta_text: e.target.value })}
                            placeholder="e.g. Optimize Now"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Discount / Promo Code</label>
                    <input
                        type="text"
                        value={copyData.discount_text}
                        onChange={(e) => setCopyData({ ...copyData, discount_text: e.target.value })}
                        placeholder="e.g. Use code ESPORTRA20 for 20% off"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none text-sm"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Public Description</label>
                    <textarea
                        value={copyData.description}
                        onChange={(e) => setCopyData({ ...copyData, description: e.target.value })}
                        rows={3}
                        placeholder="Brief description shown on your partner profile page"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none resize-none text-sm"
                    />
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end">
                    <button
                        onClick={handleSaveCopy}
                        disabled={isSavingCopy}
                        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSavingCopy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Copy</>}
                    </button>
                </div>
            </div>

            {/* ─── SECTION 4: Gallery ─── */}
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
                            <img src={url} alt={`Gallery ${idx}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <button
                                onClick={() => handleDeleteImage(url)}
                                aria-label="Delete image"
                                className="absolute top-2 right-2 p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

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
