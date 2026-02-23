import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, Palette, ShieldCheck, ArrowRight, ArrowLeft,
    Check, Loader2, Upload, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBranding } from '@/hooks/useBranding';
import { getWebsiteAssetUrl } from '@/lib/storage';

const STEPS = [
    { id: 'identity', label: 'Identity', icon: Building2, description: 'Confirm your company details' },
    { id: 'branding', label: 'Branding', icon: Palette, description: 'Upload your brand assets' },
    { id: 'legal', label: 'Agreement', icon: ShieldCheck, description: 'Accept partnership terms' },
];

/* ═══════════════════════════════════════════════════════════════
   STEP 1: IDENTITY
   ═══════════════════════════════════════════════════════════════ */
const StepIdentity = ({
    data,
    sponsorId,
    onSave,
    saving,
}: {
    data: any;
    sponsorId: string;
    onSave: (d: any) => void;
    saving: boolean;
}) => {
    const [companyName, setCompanyName] = useState(data?.company_name || '');
    const [tagline, setTagline] = useState(data?.tagline || '');

    // Pre-fill from sponsor record
    useEffect(() => {
        if (!companyName && sponsorId) {
            (supabase as any)
                .from('sponsors')
                .select('name, tagline')
                .eq('id', sponsorId)
                .single()
                .then(({ data: sponsor }: any) => {
                    if (sponsor) {
                        setCompanyName(sponsor.name || '');
                        setTagline(sponsor.tagline || '');
                    }
                });
        }
    }, [sponsorId]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black tracking-tight mb-2">
                    LET'S<span className="text-rose-500">_VERIFY</span> YOUR IDENTITY
                </h2>
                <p className="text-zinc-500 text-sm">
                    Confirm your company details. These will appear across your partner dashboard.
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Company Name
                    </label>
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Gaming Corp."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white text-lg focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none placeholder:text-zinc-700"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                        Brand Tagline <span className="text-zinc-700">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="Powering the next generation of esports"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-5 py-4 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none placeholder:text-zinc-700"
                    />
                </div>
            </div>

            <button
                onClick={() =>
                    onSave({
                        company_name: companyName,
                        tagline,
                        contact_confirmed: true,
                    })
                }
                disabled={!companyName.trim() || saving}
                className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
            >
                {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        Continue <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   STEP 2: BRANDING
   ═══════════════════════════════════════════════════════════════ */
const StepBranding = ({
    data,
    sponsorId,
    onSave,
    onBack,
    saving,
}: {
    data: any;
    sponsorId: string;
    onSave: (d: any) => void;
    onBack: () => void;
    saving: boolean;
}) => {
    const [logoUrl, setLogoUrl] = useState<string | null>(data?.logo_url || null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFileUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);

        try {
            const ext = file.name.split('.').pop();
            const path = `${sponsorId}/logo.${ext}`;

            const { error: uploadError } = await (supabase as any).storage
                .from('system.assets.sponsors')
                .upload(path, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = (supabase as any).storage
                .from('system.assets.sponsors')
                .getPublicUrl(path);

            setLogoUrl(urlData.publicUrl);

            // Also update the sponsors table immediately
            await (supabase as any)
                .from('sponsors')
                .update({ logo_url: urlData.publicUrl })
                .eq('id', sponsorId);
        } catch (err: any) {
            console.error('Upload failed:', err);
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

            {/* Drop Zone */}
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
                    input.onchange = (e: any) => {
                        const file = e.target.files?.[0];
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
                            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
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

            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
                >
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button
                    onClick={() => onSave({ logo_url: logoUrl })}
                    disabled={saving}
                    className="flex-[2] py-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
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

/* ═══════════════════════════════════════════════════════════════
   STEP 3: LEGAL
   ═══════════════════════════════════════════════════════════════ */
const StepLegal = ({
    onComplete,
    onBack,
    saving,
}: {
    onComplete: () => void;
    onBack: () => void;
    saving: boolean;
}) => {
    const [agreed, setAgreed] = useState(false);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black tracking-tight mb-2">
                    PARTNERSHIP<span className="text-rose-500">_AGREEMENT</span>
                </h2>
                <p className="text-zinc-500 text-sm">
                    Review and accept our partnership terms to activate your account.
                </p>
            </div>

            {/* Terms Preview */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-h-64 overflow-y-auto custom-scrollbar space-y-4 text-sm text-zinc-400 leading-relaxed">
                <h3 className="text-white font-bold text-base">Esportra Sponsorship Agreement</h3>
                <p>
                    This Sponsorship Agreement ("Agreement") is entered into by and between Esportra ("Platform")
                    and the undersigning Sponsor ("Partner"), effective as of the date of approval.
                </p>
                <h4 className="text-white font-semibold mt-4">1. Scope of Partnership</h4>
                <p>
                    The Partner shall be granted access to the Esportra Partner Portal, including branding placement,
                    analytics tracking, and performance reporting tools in accordance with their selected tier.
                </p>
                <h4 className="text-white font-semibold mt-4">2. Content Standards</h4>
                <p>
                    All branding materials submitted by the Partner must comply with Esportra's community guidelines
                    and content policies. Esportra reserves the right to remove non-compliant content.
                </p>
                <h4 className="text-white font-semibold mt-4">3. Data & Privacy</h4>
                <p>
                    Performance analytics provided through the Portal are aggregate and anonymized.
                    No personally identifiable information of platform users is shared with Partners.
                </p>
                <h4 className="text-white font-semibold mt-4">4. Term & Termination</h4>
                <p>
                    This agreement remains effective until terminated by either party with 30 days written notice.
                    Esportra may suspend access immediately for breach of terms.
                </p>
            </div>

            {/* Checkbox */}
            <label className="flex items-start gap-4 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer bg-zinc-950/50">
                <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500 focus:ring-offset-0 focus:ring-offset-zinc-950 cursor-pointer"
                />
                <span className="text-sm text-zinc-300">
                    I have read and agree to the <span className="text-rose-400 font-medium">Esportra Sponsorship Agreement</span> and
                    understand that my acceptance is legally binding.
                </span>
            </label>

            <div className="flex gap-3">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
                >
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button
                    onClick={onComplete}
                    disabled={!agreed || saving}
                    className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-wider"
                >
                    {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <ShieldCheck className="w-5 h-5" /> Activate Partnership
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN WIZARD
   ═══════════════════════════════════════════════════════════════ */
const OnboardingWizard = () => {
    const navigate = useNavigate();
    const { data: branding } = useBranding();
    const {
        sponsorId,
        meta,
        isLoading,
        isCompleted,
        saveStep,
        completeOnboarding,
    } = useOnboarding();

    const [activeStep, setActiveStep] = useState(0);

    // Sync with saved progress
    useEffect(() => {
        if (!isLoading && meta) {
            setActiveStep(meta.current_step || 0);
        }
    }, [isLoading, meta]);

    // Redirect if already completed
    useEffect(() => {
        if (!isLoading && isCompleted) {
            navigate('/dashboard', { replace: true });
        }
    }, [isLoading, isCompleted, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050507] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            </div>
        );
    }

    const handleSaveStep = async (stepName: string, stepData: any, nextStep: number) => {
        await saveStep.mutateAsync({ stepName, stepData, nextStep });

        // Also update sponsor record if identity step
        if (stepName === 'identity' && sponsorId) {
            await (supabase as any)
                .from('sponsors')
                .update({
                    name: stepData.company_name,
                    tagline: stepData.tagline || null,
                })
                .eq('id', sponsorId);
        }

        setActiveStep(nextStep);
    };

    const handleComplete = async () => {
        // Get user IP for legal compliance
        let ip = 'unknown';
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            ip = data.ip;
        } catch {
            // IP lookup is optional
        }

        await completeOnboarding.mutateAsync({
            agreed_at: new Date().toISOString(),
            ip,
        });

        navigate('/dashboard', { replace: true });
    };

    return (
        <div className="min-h-screen bg-[#050507] text-white flex flex-col">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
                <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[60vw] h-[60vw] bg-rose-600/[0.03] blur-[150px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <img src={branding?.logoUrl || getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')} alt="Esportra" className="w-7 h-7 object-contain" />
                    <span className="text-sm font-black tracking-tighter">
                        ESPORTRA<span className="text-rose-500">_ONBOARD</span>
                    </span>
                </div>
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                    Step {activeStep + 1} of {STEPS.length}
                </span>
            </header>

            {/* Progress Bar */}
            <div className="relative z-10 px-8 pt-6">
                <div className="flex gap-2">
                    {STEPS.map((step, idx) => (
                        <div key={step.id} className="flex-1 flex flex-col gap-2">
                            <div className="h-1 rounded-full overflow-hidden bg-zinc-900">
                                <motion.div
                                    className={`h-full rounded-full ${idx < activeStep
                                        ? 'bg-emerald-500'
                                        : idx === activeStep
                                            ? 'bg-rose-500'
                                            : 'bg-transparent'
                                        }`}
                                    initial={{ width: 0 }}
                                    animate={{ width: idx <= activeStep ? '100%' : '0%' }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${idx < activeStep
                                        ? 'bg-emerald-500/20 text-emerald-400'
                                        : idx === activeStep
                                            ? 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'
                                            : 'bg-zinc-900 text-zinc-600'
                                        }`}
                                >
                                    {idx < activeStep ? (
                                        <Check className="w-3.5 h-3.5" />
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                <span
                                    className={`text-xs font-medium tracking-tight hidden sm:block ${idx === activeStep ? 'text-white' : 'text-zinc-600'
                                        }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-12">
                <div className="w-full max-w-xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {activeStep === 0 && (
                                <StepIdentity
                                    data={meta.steps.identity}
                                    sponsorId={sponsorId || ''}
                                    onSave={(d) => handleSaveStep('identity', d, 1)}
                                    saving={saveStep.isPending}
                                />
                            )}
                            {activeStep === 1 && (
                                <StepBranding
                                    data={meta.steps.branding}
                                    sponsorId={sponsorId || ''}
                                    onSave={(d) => handleSaveStep('branding', d, 2)}
                                    onBack={() => setActiveStep(0)}
                                    saving={saveStep.isPending}
                                />
                            )}
                            {activeStep === 2 && (
                                <StepLegal
                                    onComplete={handleComplete}
                                    onBack={() => setActiveStep(1)}
                                    saving={completeOnboarding.isPending}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 text-center py-4 border-t border-white/5">
                <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.3em]">
                    Esportra Partner Ecosystem • Secure Onboarding
                </p>
            </footer>
        </div>
    );
};

export default OnboardingWizard;
