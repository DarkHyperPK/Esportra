import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { useTournamentWizard } from '@/hooks/useTournamentWizard';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { isSuperAdminUser } from '@/lib/adminAccess';
import WizardProgress from './WizardProgress';
import StepBasicInfo from './StepBasicInfo';
import StepFormatRules from './StepFormatRules';
import StepBranding from './StepBranding';
import StepPrizeDistribution from './StepPrizeDistribution';
import StepRegistration from './StepRegistration';
import StepSettings from './StepSettings';
import StepReview from './StepReview';
import { WIZARD_STEPS } from '@/types/tournamentWizard';
import { CommandButton, CommandHeader, CommandSection, CommandShell } from '@/components/management/CommandSurface';

import { TournamentWizardData } from '@/types/tournamentWizard';

interface WizardContainerProps {
    initialData?: TournamentWizardData;
    tournamentId?: string;
    participantsCount?: number;
    activeInvitationCount?: number;
}

const WizardContainer: React.FC<WizardContainerProps> = ({
    initialData,
    tournamentId,
    participantsCount,
    activeInvitationCount,
}) => {
    useGameCatalog();
    const admin = useAdmin();
    const { profile } = useAuth();
    const isSuperAdmin = isSuperAdminUser(admin, profile);
    const {
        currentStep,
        data,
        errors,
        isSubmitting,
        stepValidation,
        updateData,
        nextStep,
        prevStep,
        goToStep,
        clearDraft,
        submitTournament,
    } = useTournamentWizard(initialData, tournamentId, { activeInvitationCount });

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <StepBasicInfo data={data} updateData={updateData} errors={errors} isEditMode={!!tournamentId && !isSuperAdmin} />;
            case 2:
                return <StepFormatRules data={data} updateData={updateData} errors={errors} isEditMode={!!tournamentId && !isSuperAdmin} tournamentId={tournamentId} participantsCount={participantsCount} />;
            case 3:
                return <StepBranding data={data} updateData={updateData} errors={errors} />;
            case 4:
                return <StepPrizeDistribution data={data} updateData={updateData} errors={errors} isEditMode={!!tournamentId && !isSuperAdmin} />;
            case 5:
                return (
                    <StepRegistration
                        data={data}
                        updateData={updateData}
                        errors={errors}
                        isEditMode={!!tournamentId && !isSuperAdmin}
                        activeInvitationCount={activeInvitationCount}
                    />
                );
            case 6:
                return <StepSettings data={data} updateData={updateData} errors={errors} />;
            case 7:
                return <StepReview data={data} errors={errors} onEdit={goToStep} />;
            default:
                return null;
        }
    };

    const isLastStep = currentStep === WIZARD_STEPS.length;
    const isFirstStep = currentStep === 1;

    return (
        <CommandShell>
            <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
                <CommandHeader
                    eyebrow={tournamentId ? 'Tournament Command' : 'Tournament Setup'}
                    title={tournamentId ? 'Edit Tournament' : 'Create Tournament'}
                    description={tournamentId ? 'Update the operating contract for this tournament.' : 'Configure a tournament with backend-validated game modes, roster rules, and registration settings.'}
                />

                <WizardProgress
                    currentStep={currentStep}
                    stepValidation={stepValidation}
                    onStepClick={goToStep}
                    steps={WIZARD_STEPS}
                />

                <CommandSection className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 opacity-20">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                    </div>

                    <AnimatePresence mode="wait">
                        {renderStep()}
                    </AnimatePresence>
                </CommandSection>

                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {!isFirstStep && (
                            <CommandButton variant="secondary" onClick={prevStep}>
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </CommandButton>
                        )}

                        {!tournamentId && (
                            <CommandButton variant="ghost" onClick={clearDraft}>
                                <Trash2 className="h-4 w-4" />
                                Clear Draft
                            </CommandButton>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {!tournamentId && (
                            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-gray-500 md:block">
                                Draft auto-saved
                            </span>
                        )}

                        {isLastStep ? (
                            <CommandButton
                                onClick={submitTournament}
                                disabled={isSubmitting || Object.keys(errors).length > 0}
                                className="min-w-[180px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {tournamentId ? 'Saving' : 'Creating'}
                                    </>
                                ) : (
                                    tournamentId ? 'Save Changes' : 'Create Tournament'
                                )}
                            </CommandButton>
                        ) : (
                            <CommandButton onClick={nextStep}>
                                Next
                                <ArrowRight className="h-4 w-4" />
                            </CommandButton>
                        )}
                    </div>
                </div>

                <div className="text-center font-mono text-[10px] uppercase tracking-widest text-gray-500">
                    {tournamentId
                        ? 'Changes apply immediately after saving.'
                        : 'Your progress is automatically saved.'}
                </div>
            </div>
        </CommandShell>
    );
};

export default WizardContainer;
