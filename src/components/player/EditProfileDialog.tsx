import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { apiClient } from "@/lib/apiClient";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CtaButton, CancelButton, OutlineButton } from "@/components/ui/app-buttons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { User, Share2, Loader2, Save, Edit, Globe, MapPin, ShieldCheck, Camera, Lock, ImageIcon, X, Move } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AvatarUploader from "./AvatarUploader";
import AvatarPickerModal from "./AvatarPickerModal";
import { type AvatarPickerSelection, type AvatarStyleId, DEFAULT_STYLE } from "./avatarStyles";
import { getCountryFlag, detectUserCountry, getCountryName, countries, getCountryFlagUrl } from "@/utils/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EntityAvatar from "@/components/ui/EntityAvatar";
import type { PublicProfileDto } from "@/types/profile";

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    autoOpenAvatarPicker?: boolean;
}

const EditProfileDialog = ({ open, onOpenChange, autoOpenAvatarPicker }: EditProfileDialogProps) => {
    const { profile, updateProfile } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [detectionFailed, setDetectionFailed] = useState(false);
    const [showManualSelector, setShowManualSelector] = useState(false);
    const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
    const [bannerUploading, setBannerUploading] = useState(false);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const [bannerFocalY, setBannerFocalY] = useState(50);
    const [bannerZoom, setBannerZoom] = useState(1);
    const [bannerHeight, setBannerHeight] = useState(200);

    const [privacySettings, setPrivacySettings] = useState({
        show_riot_account: true,
        show_steam_account: true,
    });
    const [privacySaving, setPrivacySaving] = useState(false);

    const teamQuery = useQuery({
        queryKey: ['my-teams'],
        queryFn: () => apiClient.get<any[]>('/api/teams/me'),
        enabled: !!profile?.id,
        staleTime: 1000 * 60 * 5,
    });
    const teamName = teamQuery.data?.[0]?.name ?? null;
    const teamId = teamQuery.data?.[0]?.id ?? null;

    const publicProfileQuery = useQuery({
        queryKey: ['public-profile-by-username', profile?.username],
        queryFn: () => apiClient.get<PublicProfileDto>(`/api/profiles/by-username/${profile!.username}`),
        enabled: !!profile?.username && open,
        staleTime: 5 * 60 * 1000,
    });


    // Local State for Form Fields
    const [formData, setFormData] = useState({
        username: "",
        full_name: "",
        bio: "",
        banner_url: "",
        avatar_url: "",
        avatar_seed: "",
        avatar_style: "" as AvatarStyleId | "",
        card_image_url: "",
        social_links: {
            twitter: "",
            twitch: "",
            youtube: "",
            instagram: "",
            discord: ""
        },
        riot_tag: "",
        steam_tag: "",
        country_code: ""
    });

    const handleAutodetect = useCallback(async () => {
        setDetecting(true);
        setDetectionFailed(false);
        try {
            const detected = await detectUserCountry();
            if (detected) {
                setFormData(prev => ({ ...prev, country_code: detected }));
                setDetectionFailed(false);
            } else {
                setDetectionFailed(true);
            }
        } catch {
            setDetectionFailed(true);
        } finally {
            setDetecting(false);
        }
    }, []);

    // Initialize form data only when the dialog transitions to open.
    // Using a ref to detect the open→true edge avoids re-initializing mid-session
    // (e.g. when autodetect updates formData.country_code or profile refreshes).
    const wasOpenRef = useRef(false);
    useEffect(() => {
        const justOpened = open && !wasOpenRef.current;
        wasOpenRef.current = open;
        if (!justOpened || !profile) return;

        setFormData({
            username: profile.username || "",
            full_name: profile.full_name || "",
            bio: profile.bio || "",
            banner_url: profile.banner_url || "",
            avatar_url: profile.avatar_url || "",
            avatar_seed: profile.avatar_seed || "",
            avatar_style: (profile.avatar_style as AvatarStyleId) || "",
            card_image_url: profile.card_image_url || "",
            social_links: {
                twitter: profile.social_links?.twitter || "",
                twitch: profile.social_links?.twitch || "",
                youtube: profile.social_links?.youtube || "",
                instagram: profile.social_links?.instagram || "",
                discord: profile.social_links?.discord || ""
            },
            riot_tag: profile.riot_tag || "",
            steam_tag: profile.steam_tag || "",
            country_code: profile.country_code || ""
        });

        setPrivacySettings({
            show_riot_account: profile.privacy_settings?.show_riot_account ?? true,
            show_steam_account: profile.privacy_settings?.show_steam_account ?? true,
        });

        if (!profile.country_code) handleAutodetect();
        if (autoOpenAvatarPicker) setAvatarPickerOpen(true);

        // Initialize banner appearance from cached public profile
        const pub = publicProfileQuery.data;
        setBannerFocalY(pub?.banner_focal_y ?? 50);
        setBannerZoom(pub?.banner_zoom ?? 1);
        setBannerHeight(pub?.banner_height ?? 200);
    }, [open, profile, handleAutodetect, autoOpenAvatarPicker, publicProfileQuery.data]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleNestedChange = (section: 'social_links', key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const handlePrivacyToggle = async (field: 'show_riot_account' | 'show_steam_account', value: boolean) => {
        const updated = { ...privacySettings, [field]: value };
        setPrivacySettings(updated);
        setPrivacySaving(true);
        try {
            await apiClient.put('/api/profiles/me/privacy', updated);
            toast({ title: 'Privacy settings saved' });
        } catch (error) {
            console.error('Failed to save privacy settings', error);
            setPrivacySettings((prev) => ({ ...prev, [field]: !value }));
            toast({ title: 'Failed to save', variant: 'destructive' });
        } finally {
            setPrivacySaving(false);
        }
    };

    const handleAvatarSelect = (result: AvatarPickerSelection) => {
        if (result.type === 'dicebear') {
            setFormData(prev => ({ ...prev, avatar_seed: result.seed, avatar_style: result.style, avatar_url: '' }));
        } else {
            setFormData(prev => ({ ...prev, avatar_url: result.avatarUrl, avatar_seed: '', avatar_style: '' }));
        }
    };

    const handleBannerChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile?.id) return;
        setBannerUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('bucket', 'users.banners');
            fd.append('folder', `banners/${profile.id}`);
            const { url } = await apiClient.upload<{ url: string }>('/api/storage/upload', fd);
            setFormData(prev => ({ ...prev, banner_url: url }));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Upload failed';
            toast({ title: 'Banner upload failed', description: msg, variant: 'destructive' });
        } finally {
            setBannerUploading(false);
            if (bannerInputRef.current) bannerInputRef.current.value = '';
        }
    };

    const effectiveAvatarUrl = formData.avatar_url
        || (formData.avatar_seed
            ? `https://api.dicebear.com/10.x/${formData.avatar_style || DEFAULT_STYLE}/svg?seed=${encodeURIComponent(formData.avatar_seed)}`
            : null);

    const handleSave = async () => {
        setLoading(true);
        try {
            const saves: Promise<unknown>[] = [
                updateProfile({
                    username: formData.username,
                    full_name: formData.full_name,
                    bio: formData.bio,
                    banner_url: formData.banner_url || null,
                    avatar_url: formData.avatar_url,
                    avatar_seed: formData.avatar_seed,
                    avatar_style: formData.avatar_style,
                    card_image_url: formData.card_image_url,
                    social_links: formData.social_links,
                    riot_tag: formData.riot_tag,
                    steam_tag: formData.steam_tag,
                    country_code: formData.country_code
                }),
            ];
            if (formData.banner_url) {
                saves.push(
                    apiClient.put('/api/profiles/me/banner-position', {
                        focal_y: bannerFocalY,
                        zoom: bannerZoom,
                        height: bannerHeight,
                    }),
                );
            }
            await Promise.all(saves);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['public-profile-by-username', formData.username] });
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to update profile", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-[#121214] border-zinc-800 text-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-2 bg-zinc-900/50 border-b border-zinc-800">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Edit className="w-5 h-5 text-rose-500" /> Edit Profile
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Customize your public presence on the platform.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                    <Tabs defaultValue="general" className="flex flex-col h-full">
                        <div className="px-6 pt-4">
                            <TabsList className="w-full bg-zinc-900/50 border border-zinc-800 p-1">
                                <TabsTrigger value="general" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                                    <User className="w-4 h-4 mr-2" /> General
                                </TabsTrigger>
                                <TabsTrigger value="socials" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                                    <Share2 className="w-4 h-4 mr-2" /> Socials
                                </TabsTrigger>
                                <TabsTrigger value="privacy" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                                    <Lock className="w-4 h-4 mr-2" /> Privacy
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 flex-1">
                            <TabsContent value="general" className="space-y-6 mt-0">
                                {/* Banner upload */}
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-rose-500" /> Profile Banner</Label>

                                    {/* Live preview */}
                                    <div
                                        className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/40"
                                        style={{ height: Math.min(bannerHeight, 160) }}
                                    >
                                        {formData.banner_url ? (
                                            <img
                                                src={formData.banner_url}
                                                alt="Banner"
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    objectPosition: `center ${bannerFocalY}%`,
                                                    transform: `scale(${bannerZoom})`,
                                                    transformOrigin: `center ${bannerFocalY}%`,
                                                    pointerEvents: 'none',
                                                    userSelect: 'none',
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 flex items-center justify-center">
                                                <span className="text-xs text-zinc-600">No banner set</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => bannerInputRef.current?.click()}
                                                disabled={bannerUploading}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {bannerUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                                                {bannerUploading ? 'Uploading…' : 'Upload'}
                                            </button>
                                            {formData.banner_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, banner_url: '' }))}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-md transition-colors"
                                                >
                                                    <X className="w-3 h-3" /> Remove
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            ref={bannerInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/avif"
                                            className="hidden"
                                            onChange={handleBannerChange}
                                        />
                                    </div>

                                    {/* Adjustment sliders — shown only when banner is set */}
                                    {formData.banner_url && (
                                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3 space-y-3">
                                            <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                                                <Move className="w-3 h-3" /> Adjust banner appearance
                                            </p>
                                            {/* Position */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-zinc-500 w-16 shrink-0">Position</span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    step={1}
                                                    value={bannerFocalY}
                                                    onChange={(e) => setBannerFocalY(Number(e.target.value))}
                                                    className="flex-1"
                                                    style={{ accentColor: '#f43f5e' }}
                                                />
                                                <span className="text-xs text-zinc-600 w-8 text-right">{Math.round(bannerFocalY)}%</span>
                                            </div>
                                            {/* Zoom */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-zinc-500 w-16 shrink-0">Zoom</span>
                                                <input
                                                    type="range"
                                                    min={1}
                                                    max={3}
                                                    step={0.05}
                                                    value={bannerZoom}
                                                    onChange={(e) => setBannerZoom(Number(e.target.value))}
                                                    className="flex-1"
                                                    style={{ accentColor: '#f43f5e' }}
                                                />
                                                <span className="text-xs text-zinc-600 w-8 text-right">{bannerZoom.toFixed(1)}×</span>
                                            </div>
                                            {/* Height */}
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-zinc-500 w-16 shrink-0">Height</span>
                                                <input
                                                    type="range"
                                                    min={80}
                                                    max={500}
                                                    step={10}
                                                    value={bannerHeight}
                                                    onChange={(e) => setBannerHeight(Number(e.target.value))}
                                                    className="flex-1"
                                                    style={{ accentColor: '#f43f5e' }}
                                                />
                                                <span className="text-xs text-zinc-600 w-8 text-right">{bannerHeight}px</span>
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-500">Hover the banner to upload. Recommended: 1500×500px, JPEG/PNG.</p>
                                </div>

                                <div className="flex flex-col items-center justify-center mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setAvatarPickerOpen(true)}
                                        className="relative group cursor-pointer"
                                    >
                                        <div className="w-32 h-32 rounded-full border-2 border-zinc-700 group-hover:border-rose-500 transition-colors bg-zinc-900 overflow-hidden">
                                            <EntityAvatar
                                                src={effectiveAvatarUrl}
                                                name="Avatar"
                                                type="user"
                                                size="w-32 h-32"
                                                className="border-none"
                                            />
                                        </div>
                                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <div className="bg-rose-500 p-2 rounded-full text-white shadow-lg scale-90 group-hover:scale-100 transition-transform">
                                                <Camera className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </button>
                                    <p className="text-xs text-gray-500 mt-4">Click to change avatar</p>
                                </div>

                                {profile && (
                                    <AvatarPickerModal
                                        open={avatarPickerOpen}
                                        onClose={() => setAvatarPickerOpen(false)}
                                        userId={profile.id}
                                        username={profile.username}
                                        currentSeed={formData.avatar_seed || null}
                                        currentStyle={(formData.avatar_style as AvatarStyleId) || null}
                                        currentPhotoUrl={
                                            formData.avatar_url && !formData.avatar_url.includes('dicebear')
                                                ? formData.avatar_url
                                                : null
                                        }
                                        onSelect={handleAvatarSelect}
                                    />
                                )}

                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <Label>Player Card Picture</Label>
                                    <div className="flex items-center gap-4 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
                                        {teamName && teamId ? (
                                            <AvatarUploader
                                                value={formData.card_image_url}
                                                onChange={(url) => handleChange('card_image_url', url)}
                                                size="lg"
                                                teamId={teamId}
                                            />
                                        ) : (
                                            <div className="w-24 h-24 bg-zinc-900/50 rounded-lg flex items-center justify-center border-2 border-dashed border-zinc-700 opacity-50">
                                                <div className="text-center p-2">
                                                    <User className="w-6 h-6 text-zinc-600 mx-auto mb-1" />
                                                    <span className="text-[10px] text-zinc-500 font-medium">No Team</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-300">
                                                This picture will be displayed on your team's roster card.
                                                {teamName ? (
                                                    <span className="text-emerald-500 block text-xs mt-1">✓ Uploading to team: {teamName}</span>
                                                ) : (
                                                    <span className="text-amber-500 block text-xs mt-1">⚠ You must be part of a team to upload a player card.</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            value={formData.username}
                                            onChange={(e) => handleChange('username', e.target.value)}
                                            className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50"
                                        />
                                        <p className="text-xs text-gray-500">Unique handle for platform identification.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="country" className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-rose-500" /> Nationality / Country
                                        </Label>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg min-h-[54px]">
                                                {formData.country_code ? (
                                                    <>
                                                        <img
                                                            src={getCountryFlagUrl(formData.country_code)}
                                                            alt={formData.country_code}
                                                            className="w-8 h-6 object-cover rounded shadow-sm border border-zinc-700"
                                                        />
                                                        <span className="text-sm font-medium text-white">{getCountryName(formData.country_code)}</span>
                                                        {!showManualSelector && (
                                                            <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                                                <MapPin className="w-3 h-3" /> Detected
                                                            </div>
                                                        )}
                                                        {detectionFailed && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowManualSelector(true)}
                                                                className="ml-auto text-[10px] text-rose-400 hover:text-rose-300 h-6 px-2 underline transition-colors"
                                                            >
                                                                Change
                                                            </button>
                                                        )}
                                                    </>
                                                ) : detecting ? (
                                                    <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Detecting location...
                                                    </div>
                                                ) : detectionFailed ? (
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-2 text-amber-500 text-sm">
                                                            <ShieldCheck className="w-4 h-4" />
                                                            Detection failed
                                                        </div>
                                                        <OutlineButton
                                                            size="sm"
                                                            onClick={handleAutodetect}
                                                            className="h-7 text-[10px]"
                                                        >
                                                            Try Again
                                                        </OutlineButton>
                                                    </div>
                                                ) : null}
                                            </div>

                                            {showManualSelector && (
                                                <div className="animate-in fade-in slide-in-from-top-1">
                                                    <Select
                                                        value={formData.country_code}
                                                        onValueChange={(val) => handleChange('country_code', val)}
                                                    >
                                                        <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white">
                                                            <SelectValue placeholder="Select country manually" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white max-h-60">
                                                            {countries.map((c) => (
                                                                <SelectItem key={c.code} value={c.code}>
                                                                    {getCountryFlag(c.code)} {c.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {!detectionFailed && !formData.country_code && !detecting && (
                                                <Button size="sm" variant="outline" onClick={handleAutodetect} className="w-fit h-8 text-xs">
                                                    <Globe className="w-3 h-3 mr-2" /> Detect My Location
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500 italic">
                                            {detectionFailed
                                                ? "We couldn't automatically detect your country. Please try again or select manually."
                                                : "Location is automatically detected to ensure ranking accuracy."}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Display Name</Label>
                                        <Input
                                            id="full_name"
                                            value={formData.full_name}
                                            onChange={(e) => handleChange('full_name', e.target.value)}
                                            className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="bio">Bio</Label>
                                        <Textarea
                                            id="bio"
                                            value={formData.bio}
                                            onChange={(e) => handleChange('bio', e.target.value)}
                                            className="bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50 min-h-[120px]"
                                            placeholder="Tell the community about yourself..."
                                        />
                                    </div>
                                </div>
                            </TabsContent>


                            <TabsContent value="socials" className="space-y-6 mt-0">
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label>Twitter / X</Label>
                                        <div className="flex rounded-md shadow-sm">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-800 bg-zinc-900 text-gray-500 sm:text-sm">@</span>
                                            <Input
                                                value={formData.social_links.twitter}
                                                onChange={(e) => handleNestedChange('social_links', 'twitter', e.target.value)}
                                                className="rounded-l-none bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50"
                                                placeholder="username"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Twitch</Label>
                                        <div className="flex rounded-md shadow-sm">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-800 bg-zinc-900 text-gray-500 sm:text-sm">twitch.tv/</span>
                                            <Input
                                                value={formData.social_links.twitch}
                                                onChange={(e) => handleNestedChange('social_links', 'twitch', e.target.value)}
                                                className="rounded-l-none bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50"
                                                placeholder="channel"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>YouTube</Label>
                                        <div className="flex rounded-md shadow-sm">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-800 bg-zinc-900 text-gray-500 sm:text-sm">youtube.com/</span>
                                            <Input
                                                value={formData.social_links.youtube}
                                                onChange={(e) => handleNestedChange('social_links', 'youtube', e.target.value)}
                                                className="rounded-l-none bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50"
                                                placeholder="@channel"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Instagram</Label>
                                        <div className="flex rounded-md shadow-sm">
                                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-zinc-800 bg-zinc-900 text-gray-500 sm:text-sm">instagram.com/</span>
                                            <Input
                                                value={formData.social_links.instagram}
                                                onChange={(e) => handleNestedChange('social_links', 'instagram', e.target.value)}
                                                className="rounded-l-none bg-zinc-900/50 border-zinc-800 focus:border-rose-500/50"
                                                placeholder="username"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="privacy" className="space-y-6 mt-0">
                                <div className="space-y-1 border-b border-zinc-800 pb-4">
                                    <h3 className="text-sm font-medium text-gray-300">Account Visibility</h3>
                                    <p className="text-xs text-gray-500">
                                        Control which linked accounts appear on your public profile.
                                    </p>
                                </div>

                                <div className="space-y-0 divide-y divide-zinc-800/60">
                                    <div className="flex items-center justify-between py-4">
                                        <div className="space-y-0.5">
                                            <p className="text-sm text-gray-200">Riot account</p>
                                            <p className="text-xs text-gray-500">Show on public profile</p>
                                        </div>
                                        <Switch
                                            checked={privacySettings.show_riot_account}
                                            onCheckedChange={(checked) => handlePrivacyToggle('show_riot_account', checked)}
                                            disabled={privacySaving}
                                            aria-label="Show Riot account on public profile"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between py-4">
                                        <div className="space-y-0.5">
                                            <p className="text-sm text-gray-200">Steam account</p>
                                            <p className="text-xs text-gray-500">Show on public profile</p>
                                        </div>
                                        <Switch
                                            checked={privacySettings.show_steam_account}
                                            onCheckedChange={(checked) => handlePrivacyToggle('show_steam_account', checked)}
                                            disabled={privacySaving}
                                            aria-label="Show Steam account on public profile"
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-800">
                    <CancelButton onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </CancelButton>
                    <CtaButton onClick={handleSave} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </>
                        )}
                    </CtaButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditProfileDialog;
