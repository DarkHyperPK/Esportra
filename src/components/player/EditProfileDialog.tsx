import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { User, Share2, Loader2, Save, Edit, Globe, MapPin, ShieldCheck } from "lucide-react";
import AvatarUploader from "./AvatarUploader";
import { getCountryFlag, detectUserCountry, getCountryName, countries, getCountryFlagUrl } from "@/utils/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditProfileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EditProfileDialog = ({ open, onOpenChange }: EditProfileDialogProps) => {
    const { profile, updateProfile } = useAuth();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [detectionFailed, setDetectionFailed] = useState(false);
    const [showManualSelector, setShowManualSelector] = useState(false);

    const teamQuery = useQuery({
        queryKey: ['my-teams'],
        queryFn: () => apiClient.get<any[]>('/api/teams/me'),
        enabled: !!profile?.id,
        staleTime: 1000 * 60 * 5,
    });
    const teamName = teamQuery.data?.[0]?.name ?? null;


    // Local State for Form Fields
    const [formData, setFormData] = useState({
        username: "",
        full_name: "",
        bio: "",
        avatar_url: "",
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

    // Initialize form data when profile loads or dialog opens
    useEffect(() => {
        if (profile && open) {
            setFormData({
                username: profile.username || "",
                full_name: profile.full_name || "",
                bio: profile.bio || "",
                avatar_url: profile.avatar_url || "",
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

            // Autodetect if empty
            if (!profile.country_code && !formData.country_code) {
                handleAutodetect();
            }
        }
    }, [profile, open, formData.country_code, handleAutodetect]);

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

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfile({
                username: formData.username,
                full_name: formData.full_name,
                bio: formData.bio,
                avatar_url: formData.avatar_url,
                card_image_url: formData.card_image_url,
                social_links: formData.social_links,
                riot_tag: formData.riot_tag,
                steam_tag: formData.steam_tag,
                country_code: formData.country_code
            });
            // Invalidate all profile queries so the page reflects changes
            queryClient.invalidateQueries({ queryKey: ['profile'] });
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

                <div className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="general" className="flex flex-col h-full">
                        <div className="px-6 pt-4">
                            <TabsList className="w-full bg-zinc-900/50 border border-zinc-800 p-1">
                                <TabsTrigger value="general" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                                    <User className="w-4 h-4 mr-2" /> General
                                </TabsTrigger>
                                <TabsTrigger value="socials" className="flex-1 data-[state=active]:bg-zinc-800 data-[state=active]:text-rose-500">
                                    <Share2 className="w-4 h-4 mr-2" /> Socials
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="p-6 flex-1">
                            <TabsContent value="general" className="space-y-6 mt-0">
                                <div className="flex flex-col items-center justify-center mb-6">
                                    <AvatarUploader
                                        value={formData.avatar_url || ''}
                                        onChange={(url) => setFormData({ ...formData, avatar_url: url })}
                                        onRemove={() => setFormData({ ...formData, avatar_url: '' })}
                                        size="xl"
                                        uploadPath={profile?.id ? `profile-pictures/${profile.id}_${Date.now()}_avatar.png` : undefined}
                                    />
                                    <p className="text-xs text-gray-500 mt-4">Click to update avatar</p>
                                </div>

                                <div className="space-y-4 border-t border-zinc-800 pt-6">
                                    <Label>Player Card Picture</Label>
                                    <div className="flex items-center gap-4 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
                                        {teamName ? (
                                            <AvatarUploader
                                                value={formData.card_image_url}
                                                onChange={(url) => handleChange('card_image_url', url)}
                                                size="lg"
                                                uploadPath={profile?.id ? `Player-cards/${teamName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}/${profile.id}_${Date.now()}_card.png` : undefined}
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
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setShowManualSelector(true)}
                                                                className="ml-auto text-[10px] text-rose-400 hover:text-rose-300 h-6 px-2 underline"
                                                            >
                                                                Change
                                                            </Button>
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
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={handleAutodetect}
                                                            className="h-7 text-[10px] border-zinc-700 hover:bg-zinc-800"
                                                        >
                                                            Try Again
                                                        </Button>
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
                        </div>
                    </Tabs>
                </div>

                <DialogFooter className="p-6 bg-zinc-900/50 border-t border-zinc-800">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-zinc-700 hover:bg-zinc-800 text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Save Changes
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditProfileDialog;
