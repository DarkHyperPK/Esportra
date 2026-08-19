import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useBranding } from '@/hooks/useBranding';
import { getWebsiteAssetUrl } from '@/lib/storage';
import StepBranding from '@/components/onboarding/StepBranding';

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
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

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

    const handleSaveBranding = async (stepData: Record<string, string | boolean | null>) => {
        await saveStep.mutateAsync({ stepName: 'branding', stepData, nextStep: 1 });
        await completeOnboarding.mutateAsync();
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
                    Brand Setup
                </span>
            </header>

            <div className="relative z-10 px-8 pt-6">
                <div className="h-1 rounded-full overflow-hidden bg-zinc-900">
                    <motion.div
                        className="h-full rounded-full bg-rose-500"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>
            </div>

            <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-12">
                <div className="w-full max-w-xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="branding"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <StepBranding
                                data={meta?.steps?.branding ?? {}}
                                sponsorId={sponsorId || ''}
                                onSave={handleSaveBranding}
                                saving={saveStep.isPending || completeOnboarding.isPending}
                                canContinue={hasAcceptedTerms}
                                termsCheckbox={
                                    <label className="flex items-start gap-3 text-sm text-zinc-400">
                                        <input
                                            type="checkbox"
                                            checked={hasAcceptedTerms}
                                            onChange={(event) => setHasAcceptedTerms(event.target.checked)}
                                            className="mt-1"
                                        />
                                        I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline hover:text-rose-300">Esportra Partner Portal terms</a> (version 2026-07).
                                    </label>
                                }
                            />
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
