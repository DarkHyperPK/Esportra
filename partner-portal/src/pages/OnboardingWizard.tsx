import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBranding } from '@/hooks/useBranding';
import { getWebsiteAssetUrl } from '@/lib/storage';
import StepBranding from '@/components/onboarding/StepBranding';
import StepLegal from '@/components/onboarding/StepLegal';

const STEPS = [
    { id: 'branding', label: 'Branding', description: 'Upload your brand assets' },
    { id: 'legal', label: 'Agreement', description: 'Accept partnership terms' },
];

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

    useEffect(() => {
        if (!isLoading && meta) {
            setActiveStep(meta.current_step || 0);
        }
    }, [isLoading, meta]);

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

    const handleSaveStep = async (stepName: string, stepData: Record<string, string | boolean | null>, nextStep: number) => {
        await saveStep.mutateAsync({ stepName, stepData, nextStep });
        setActiveStep(nextStep);
    };

    const handleComplete = async () => {
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
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
                <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[60vw] h-[60vw] bg-rose-600/[0.03] blur-[150px] rounded-full" />
            </div>

            <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <img src={branding?.logoUrl || getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')} alt="Esportra" loading="lazy" className="w-7 h-7 object-contain" />
                    <span className="text-sm font-black tracking-tighter">
                        ESPORTRA<span className="text-rose-500">_ONBOARD</span>
                    </span>
                </div>
                <span className="text-xs font-mono text-zinc-600 uppercase tracking-widest">
                    Step {activeStep + 1} of {STEPS.length}
                </span>
            </header>

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
                                <StepBranding
                                    data={meta.steps.branding}
                                    sponsorId={sponsorId || ''}
                                    onSave={(d) => handleSaveStep('branding', d, 1)}
                                    saving={saveStep.isPending}
                                />
                            )}
                            {activeStep === 1 && (
                                <StepLegal
                                    onComplete={handleComplete}
                                    onBack={() => setActiveStep(0)}
                                    saving={completeOnboarding.isPending}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            <footer className="relative z-10 text-center py-4 border-t border-white/5">
                <p className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.3em]">
                    Esportra Partner Ecosystem • Secure Onboarding
                </p>
            </footer>
        </div>
    );
};

export default OnboardingWizard;
