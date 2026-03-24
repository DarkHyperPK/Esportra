'use client';

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useRequireVerification } from '@/hooks/useRequireVerification';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Building2,
    ArrowRight,
    ArrowLeft,
    Upload,
    Check,
    Sparkles,
    Globe,
    Twitter,
    Instagram,
    Youtube,
    Link2,
    Trophy,
    Users,
    Loader2,
    CheckCircle
} from 'lucide-react';
import Footer from '@/components/Footer';

const STEPS = [
    { id: 1, title: 'Welcome', icon: Sparkles },
    { id: 2, title: 'Basic Info', icon: Building2 },
    { id: 3, title: 'Branding', icon: Upload },
    { id: 4, title: 'About', icon: Users },
    { id: 5, title: 'Review', icon: Check },
];

const OrganizationWizard: React.FC = () => {
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const requireVerification = useRequireVerification();

    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [socialLinks, setSocialLinks] = useState({
        website: '',
        twitter: '',
        instagram: '',
        youtube: '',
        discord: '',
    });

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    const handleNameChange = (value: string) => {
        setName(value);
        setSlug(generateSlug(value));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/org-logo.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('organizer-media')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('organizer-media')
                .getPublicUrl(fileName);

            setLogoUrl(urlData.publicUrl);
            toast({ title: 'Logo uploaded!' });
        } catch (error: any) {
            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        }
    };

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/org-banner.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('organizer-media')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('organizer-media')
                .getPublicUrl(fileName);

            setBannerUrl(urlData.publicUrl);
            toast({ title: 'Banner uploaded!' });
        } catch (error: any) {
            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        }
    };

    const handleCreate = async () => {
        if (!requireVerification()) return;
        if (!name.trim() || !slug.trim()) {
            toast({ title: 'Error', description: 'Name and slug are required.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            await apiClient.post('/api/organizations', {
                    name: name.trim(),
                    slug: slug.trim(),
                    description: description.trim() || null,
                    logoUrl: logoUrl.trim() || null,
                    bannerUrl: bannerUrl.trim() || null,
                    socialLinks: socialLinks,
                });

            // Notify other components that org was created
            window.dispatchEvent(new Event('organizationCreated'));

            toast({ title: 'Success!', description: 'Your organization has been created.' });
            navigate('/organizer/dashboard?tab=organization');
        } catch (error: any) {
            console.error('Error creating organization:', error);
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const nextStep = () => {
        if (currentStep === 2 && (!name.trim() || !slug.trim())) {
            toast({ title: 'Required', description: 'Please fill in the organization name.', variant: 'destructive' });
            return;
        }
        if (currentStep < 5) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepWelcome />;
            case 2:
                return (
                    <StepBasicInfo
                        name={name}
                        slug={slug}
                        onNameChange={handleNameChange}
                        onSlugChange={setSlug}
                        generateSlug={generateSlug}
                    />
                );
            case 3:
                return (
                    <StepBranding
                        name={name}
                        logoUrl={logoUrl}
                        bannerUrl={bannerUrl}
                        onLogoUpload={handleLogoUpload}
                        onBannerUpload={handleBannerUpload}
                    />
                );
            case 4:
                return (
                    <StepAbout
                        description={description}
                        socialLinks={socialLinks}
                        onDescriptionChange={setDescription}
                        onSocialLinksChange={setSocialLinks}
                    />
                );
            case 5:
                return (
                    <StepReview
                        name={name}
                        slug={slug}
                        description={description}
                        logoUrl={logoUrl}
                        bannerUrl={bannerUrl}
                        socialLinks={socialLinks}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-esports-dark text-white">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-esports-purple/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-esports-accent/20 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 container mx-auto px-4 py-12 max-w-4xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-esports-purple/20 to-esports-accent/20 border border-white/10 mb-6">
                        <Building2 className="h-8 w-8 text-esports-accent" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">
                        <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                            Setup Your Organization
                        </span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-xl mx-auto">
                        Create your organization to start hosting tournaments and build your esports brand.
                    </p>
                </motion.div>

                {/* Progress Bar */}
                <div className="mb-12">
                    <div className="flex justify-between items-center relative">
                        {/* Progress Line */}
                        <div className="absolute left-0 right-0 top-1/2 h-1 bg-white/10 -translate-y-1/2 rounded-full" />
                        <div
                            className="absolute left-0 top-1/2 h-1 bg-gradient-to-r from-esports-purple to-esports-accent -translate-y-1/2 rounded-full transition-all duration-500"
                            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                        />

                        {STEPS.map((step) => {
                            const Icon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: step.id * 0.1 }}
                                    className="relative z-10 flex flex-col items-center"
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted
                                            ? 'bg-esports-accent border-esports-accent'
                                            : isActive
                                                ? 'bg-esports-purple border-esports-purple shadow-lg shadow-esports-purple/50'
                                                : 'bg-[#0a0a0c] border-white/20'
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle className="h-5 w-5 text-white" />
                                        ) : (
                                            <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                        )}
                                    </div>
                                    <span className={`mt-2 text-xs font-medium ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                        {step.title}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Card className="border-white/5 bg-gradient-to-br from-[#0a0a0c]/95 to-[#050507]/95 backdrop-blur-xl p-8 md:p-12 rounded-3xl">
                            {renderStep()}
                        </Card>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    <Button
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className={`border-white/10 hover:bg-white/5 gap-2 ${currentStep === 1 ? 'invisible' : ''}`}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>

                    {currentStep < 5 ? (
                        <Button
                            onClick={nextStep}
                            className="bg-gradient-to-r from-esports-purple to-esports-accent hover:from-esports-purple/90 hover:to-esports-accent/90 gap-2 px-8"
                        >
                            Next
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleCreate}
                            disabled={saving || !name.trim() || !slug.trim()}
                            className="bg-gradient-to-r from-esports-green to-emerald-500 hover:from-esports-green/90 hover:to-emerald-500/90 gap-2 px-8"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
                                    Create Organization
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            <Footer />
        </div>
    );
};

// Step Components
const StepWelcome: React.FC = () => (
    <div className="text-center py-8">
        <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-esports-purple/20 to-esports-accent/20 border border-white/10 mb-6">
            <Trophy className="h-12 w-12 text-esports-accent" />
        </div>
        <h2 className="text-3xl font-bold font-heading mb-4">Welcome, Organizer!</h2>
        <p className="text-gray-400 text-lg max-w-md mx-auto mb-8">
            Before you can host tournaments, you need to set up your organization.
            This will be your public brand that players will see.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            {[
                { icon: Building2, title: 'Professional Identity', desc: 'Your org name appears on all tournaments' },
                { icon: Users, title: 'Build Your Community', desc: 'Players can follow your organization' },
                { icon: Trophy, title: 'Host Tournaments', desc: 'Create and manage competitive events' },
            ].map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="p-4 rounded-2xl border border-white/5 bg-white/5"
                >
                    <item.icon className="h-6 w-6 text-esports-accent mb-2" />
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                </motion.div>
            ))}
        </div>
    </div>
);

const StepBasicInfo: React.FC<{
    name: string;
    slug: string;
    onNameChange: (value: string) => void;
    onSlugChange: (value: string) => void;
    generateSlug: (name: string) => string;
}> = ({ name, slug, onNameChange, onSlugChange, generateSlug }) => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-2xl font-bold font-heading mb-2">Basic Information</h2>
            <p className="text-gray-400">Choose a name for your organization</p>
        </div>
        <div className="max-w-md mx-auto space-y-6">
            <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Organization Name *</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="e.g., Esportra Gaming"
                    className="bg-white/5 border-white/10 focus:border-esports-accent text-lg py-6"
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="slug" className="text-gray-300">URL Slug *</Label>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4">
                    <span className="text-gray-500 text-sm">esportra.com/org/</span>
                    <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => onSlugChange(generateSlug(e.target.value))}
                        placeholder="esportra-gaming"
                        className="bg-transparent border-0 focus:ring-0 p-0"
                    />
                </div>
                <p className="text-xs text-gray-500">This will be your public profile URL</p>
            </div>
        </div>
    </div>
);

const StepBranding: React.FC<{
    name: string;
    logoUrl: string;
    bannerUrl: string;
    onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBannerUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ name, logoUrl, bannerUrl, onLogoUpload, onBannerUpload }) => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-2xl font-bold font-heading mb-2">Branding</h2>
            <p className="text-gray-400">Upload your logo and banner (optional)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="space-y-4">
                <Label className="text-gray-300">Organization Logo</Label>
                <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-32 w-32 border-4 border-white/10">
                        <AvatarImage src={logoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-esports-purple to-esports-accent text-3xl font-bold">
                            {name ? name[0].toUpperCase() : 'O'}
                        </AvatarFallback>
                    </Avatar>
                    <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
                        <Button variant="outline" size="sm" asChild className="border-white/10 hover:bg-white/5">
                            <span>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Logo
                            </span>
                        </Button>
                    </label>
                    <p className="text-xs text-gray-500 text-center">200×200px recommended</p>
                </div>
            </div>
            <div className="space-y-4">
                <Label className="text-gray-300">Banner Image</Label>
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="w-full h-32 rounded-2xl bg-gradient-to-r from-esports-purple/30 to-esports-accent/30 border border-white/10 flex items-center justify-center overflow-hidden"
                        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    >
                        {!bannerUrl && <span className="text-gray-500 text-sm">1200×300 recommended</span>}
                    </div>
                    <label className="cursor-pointer">
                        <input type="file" accept="image/*" onChange={onBannerUpload} className="hidden" />
                        <Button variant="outline" size="sm" asChild className="border-white/10 hover:bg-white/5">
                            <span>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Banner
                            </span>
                        </Button>
                    </label>
                </div>
            </div>
        </div>
    </div>
);

const StepAbout: React.FC<{
    description: string;
    socialLinks: {
        website?: string;
        twitter?: string;
        instagram?: string;
        youtube?: string;
        discord?: string;
    };
    onDescriptionChange: (value: string) => void;
    onSocialLinksChange: (links: any) => void;
}> = ({ description, socialLinks, onDescriptionChange, onSocialLinksChange }) => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-2xl font-bold font-heading mb-2">About Your Organization</h2>
            <p className="text-gray-400">Tell players about your organization (optional)</p>
        </div>
        <div className="max-w-xl mx-auto space-y-6">
            <div className="space-y-2">
                <Label className="text-gray-300">Description</Label>
                <Textarea
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Tell players what makes your organization special..."
                    className="bg-white/5 border-white/10 focus:border-esports-accent min-h-[120px]"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                    { key: 'website', icon: Globe, placeholder: 'https://...', color: 'text-esports-accent' },
                    { key: 'twitter', icon: Twitter, placeholder: '@username', color: 'text-blue-400' },
                    { key: 'instagram', icon: Instagram, placeholder: '@username', color: 'text-pink-400' },
                    { key: 'youtube', icon: Youtube, placeholder: 'Channel URL', color: 'text-red-500' },
                    { key: 'discord', icon: Link2, placeholder: 'Invite link', color: 'text-indigo-400' },
                ].map((item) => (
                    <div key={item.key} className="space-y-2">
                        <Label className={`flex items-center gap-2 text-gray-300`}>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                            {item.key.charAt(0).toUpperCase() + item.key.slice(1)}
                        </Label>
                        <Input
                            value={(socialLinks as any)[item.key] || ''}
                            onChange={(e) => onSocialLinksChange({ ...socialLinks, [item.key]: e.target.value })}
                            placeholder={item.placeholder}
                            className="bg-white/5 border-white/10 focus:border-esports-accent"
                        />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const StepReview: React.FC<{
    name: string;
    slug: string;
    description: string;
    logoUrl: string;
    bannerUrl: string;
    socialLinks: any;
}> = ({ name, slug, description, logoUrl, bannerUrl, socialLinks }) => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-2xl font-bold font-heading mb-2">Review Your Organization</h2>
            <p className="text-gray-400">Make sure everything looks good</p>
        </div>

        {/* Preview Card */}
        <div className="max-w-2xl mx-auto">
            <div className="rounded-3xl overflow-hidden border border-white/5 bg-[#0a0a0c]">
                {/* Banner */}
                <div
                    className="h-32 bg-gradient-to-r from-esports-purple/30 via-esports-accent/20 to-esports-blue/30"
                    style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                />

                {/* Content */}
                <div className="relative px-6 pb-6">
                    <Avatar className="h-20 w-20 -mt-10 border-4 border-[#0a0a0c]">
                        <AvatarImage src={logoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-esports-purple to-esports-accent text-2xl font-bold">
                            {name ? name[0].toUpperCase() : 'O'}
                        </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-bold mt-4">{name || 'Your Organization'}</h3>
                    <p className="text-gray-500 text-sm">@{slug || 'your-slug'}</p>
                    {description && <p className="text-gray-400 mt-3 text-sm">{description}</p>}

                    {/* Social Icons */}
                    {Object.values(socialLinks).some(v => v) && (
                        <div className="flex gap-3 mt-4">
                            {socialLinks.website && <Globe className="h-4 w-4 text-gray-400" />}
                            {socialLinks.twitter && <Twitter className="h-4 w-4 text-gray-400" />}
                            {socialLinks.instagram && <Instagram className="h-4 w-4 text-gray-400" />}
                            {socialLinks.youtube && <Youtube className="h-4 w-4 text-gray-400" />}
                            {socialLinks.discord && <Link2 className="h-4 w-4 text-gray-400" />}
                        </div>
                    )}
                </div>
            </div>

            <p className="text-center text-gray-500 text-sm mt-6">
                Your public profile will be available at <span className="text-esports-accent">/org/{slug}</span>
            </p>
        </div>
    </div>
);

export default OrganizationWizard;
