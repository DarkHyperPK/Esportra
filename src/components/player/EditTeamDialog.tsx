import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Team } from '@/hooks/useTeamManagement';
import { useTeamMutations } from '@/hooks/teams/useTeamMutations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Loader2, Upload } from 'lucide-react';
import BannerEditor from '@/components/organizer/BannerEditor';

interface EditTeamDialogProps {
    team: Team | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EditTeamDialog: React.FC<EditTeamDialogProps> = ({ team, open, onOpenChange }) => {
    const { editTeam } = useTeamMutations();

    const [name, setName] = useState('');
    const [tag, setTag] = useState('');
    const [game, setGame] = useState('');
    const [gameFormat, setGameFormat] = useState('');

    const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
        website: '',
        twitter: '',
        instagram: '',
        youtube: '',
        discord: '',
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Banner specific state
    const [bannerFile, setBannerFile] = useState<Blob | File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [showBannerCrop, setShowBannerCrop] = useState(false);
    const [tempBannerDataUrl, setTempBannerDataUrl] = useState<string>('');

    // Logo crop state
    const [showLogoCrop, setShowLogoCrop] = useState(false);
    const [tempLogoDataUrl, setTempLogoDataUrl] = useState<string>('');

    useEffect(() => {
        if (team && open) {
            setName(team.name || '');
            setTag(team.tag || '');

            setLogoFile(null);
            setLogoPreview(team.logo_url || null);

            setBannerFile(null);
            setBannerPreview(team.banner_url || null);
        }
    }, [team, open]);

    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setTempLogoDataUrl(url);
            setShowLogoCrop(true);
        }
    };

    const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setTempBannerDataUrl(url);
            setShowBannerCrop(true);
        }
    };

    const handleCropSave = (blob: Blob) => {
        setBannerFile(blob);
        setBannerPreview(URL.createObjectURL(blob));
        setShowBannerCrop(false);
    };

    const handleLogoCropSave = (blob: Blob) => {
        setLogoFile(new File([blob], 'logo.png', { type: blob.type }));
        setLogoPreview(URL.createObjectURL(blob));
        setShowLogoCrop(false);
    };

    const handleSave = async () => {
        if (!team) return;

        editTeam.mutate({
            teamId: team.id,
            name,
            tag,
            logoFile: logoFile || undefined,
            bannerFile: bannerFile || undefined,
            currentLogoUrl: team.logo_url,
            currentBannerUrl: team.banner_url,
        }, {
            onSuccess: () => {
                onOpenChange(false);
            }
        });
    };

    return (
        <>
            <Dialog open={open && !showBannerCrop && !showLogoCrop} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] border-white/5 bg-[#0a0a0c]/95 backdrop-blur-xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
                    {/* Banner Header inside Dialog */}
                    <div className="relative h-40 bg-zinc-900 group">
                        {bannerPreview ? (
                            <img src={bannerPreview} loading="lazy" alt="Team Banner" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-r from-esports-purple/20 to-esports-accent/20" />
                        )}

                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer">
                                <input type="file" accept="image/*" onChange={handleBannerSelect} className="hidden" />
                                <div className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 text-sm font-medium transition-colors">
                                    <Upload className="w-4 h-4" />
                                    Edit Banner
                                </div>
                            </label>
                        </div>

                        {/* Logo Avatar overlaid on Banner */}
                        <div className="absolute -bottom-12 left-8">
                            <div className="relative group/logo">
                                <Avatar className="h-24 w-24 border-4 border-[#0a0a0c] bg-zinc-900">
                                    <AvatarImage src={logoPreview || undefined} />
                                    <AvatarFallback className="text-2xl font-bold">{name?.charAt(0) || 'T'}</AvatarFallback>
                                </Avatar>
                                <label className="absolute inset-0 cursor-pointer rounded-full opacity-0 group-hover/logo:opacity-100 bg-black/60 flex items-center justify-center transition-opacity flex-col">
                                    <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
                                    <Upload className="h-5 w-5 mb-1" />
                                    <span className="text-[10px] font-medium">Change</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogHeader className="px-8 pt-16 pb-4">
                        <DialogTitle className="text-2xl font-bold font-heading">Edit Team Profile</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                            <div className="space-y-2">
                                <Label>Team Name *</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} className="bg-white/5 border-white/10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Team Tag *</Label>
                                <Input value={tag} onChange={e => setTag(e.target.value)} className="bg-white/5 border-white/10" />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-white/10 bg-[#050507] flex justify-end gap-3 mt-auto">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={editTeam.isPending}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={editTeam.isPending || !name.trim() || !tag.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]"
                        >
                            {editTeam.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Standalone Banner Editor component. Hidden when not cropping. */}
            {showBannerCrop && (
                <BannerEditor
                    image={tempBannerDataUrl}
                    open={showBannerCrop}
                    onClose={() => setShowBannerCrop(false)}
                    onSave={handleCropSave}
                />
            )}

            {/* Logo Crop Editor */}
            {showLogoCrop && (
                <BannerEditor
                    image={tempLogoDataUrl}
                    open={showLogoCrop}
                    onClose={() => setShowLogoCrop(false)}
                    onSave={handleLogoCropSave}
                    aspect={1}
                    title="Edit Logo"
                />
            )}
        </>
    );
};

export default EditTeamDialog;
